import { getUmi } from '@entities/nft/@x/token-info';
import {
    findMetadataPda,
    type Metadata,
    safeFetchAllMetadata,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import { publicKey, unwrapOption } from '@metaplex-foundation/umi';
import { Connection, PublicKey } from '@solana/web3.js';
import { fetchAll } from '@utils/fetch-all';

import { MAX_SIZE, USER_AGENT } from '@/app/api/metadata/proxy/config';
import { fetchResource, matchJsonContent } from '@/app/api/metadata/proxy/feature';
import { chunk } from '@/app/shared/lib/array';
import { IPFS_PROTOCOL, resolveIpfsUri } from '@/app/shared/lib/ipfs';
import { parseUrl } from '@/app/shared/lib/url';

import type { TokenInfo } from '../lib/types';

/**
 * Milliseconds to wait for one mint's off-chain JSON. Carried over from the
 * `metaplexTimeout` default in `@solflare-wallet/utl-sdk`.
 */
export const METAPLEX_TIMEOUT_MS = 5_000;

/**
 * How many off-chain JSON reads may be in flight at once. One batch names up to
 * `MAX_ADDRESSES` mints, each pointing at a third-party host, so this bounds the
 * sockets one request opens instead of fanning out over the whole batch.
 */
export const LOGO_CONCURRENCY = 8;

/**
 * Wall clock the off-chain reads may spend across one batch, in milliseconds.
 * `METAPLEX_TIMEOUT_MS` bounds a single read, but a run of slow hosts would still
 * add up past the route's `maxDuration` and lose the whole response. Past this
 * point the remaining mints report `logoURI: null`, so names, symbols and
 * decimals — which come from the metadata and mint accounts — still arrive.
 */
export const LOGO_BUDGET_MS = 10_000;

/** Decimals reported when the mint account is missing or unparseable. */
const DEFAULT_DECIMALS = 6;

/** `getMultipleAccounts` accepts at most 100 keys per request. */
const ACCOUNTS_CHUNK_SIZE = 100;

export type FetchTokenInfosMetaplexOptions = {
    onError?: (error: unknown) => void;
};

const NULL_CHAR = String.fromCharCode(0);

/**
 * Strips the null padding the token metadata program adds to fixed-width
 * strings. Matches `removeEmptyChars` in `@metaplex-foundation/js`, which the
 * SDK relied on to clean up on-chain names and symbols.
 */
function removeEmptyChars(value: string): string {
    return value.split(NULL_CHAR).join('');
}

/**
 * Reads `decimals` for each mint. Mirrors the SDK, which fetched the parsed
 * mint accounts separately because the metadata account does not carry them.
 */
async function fetchDecimals(
    mints: string[],
    rpcEndpoint: string,
    onError?: (error: unknown) => void,
): Promise<Map<string, number>> {
    const decimals = new Map<string, number>();
    if (mints.length === 0) return decimals;

    const connection = new Connection(rpcEndpoint);

    await Promise.all(
        chunk(mints, ACCOUNTS_CHUNK_SIZE).map(async batch => {
            try {
                const { value } = await connection.getMultipleParsedAccounts(batch.map(mint => new PublicKey(mint)));
                value.forEach((account, index) => {
                    const data = account?.data;
                    if (!data || !('parsed' in data)) return;
                    const parsedDecimals = data.parsed?.info?.decimals;
                    if (typeof parsedDecimals === 'number') {
                        decimals.set(batch[index], parsedDecimals);
                    }
                });
            } catch (error) {
                onError?.(error);
            }
        }),
    );

    return decimals;
}

/**
 * Resolves a mint's on-chain `uri` to something `fetchResource` can read.
 *
 * `ipfs://` is common in metadata and `fetchResource` speaks only http(s), so an ipfs URI is
 * mapped to the same gateway the browser path uses via `getProxiedUri`. Without this every
 * unlisted mint hosted on IPFS reports a blocked protocol instead of a logo.
 *
 * Returns '' when the URI names nothing readable — unparseable, or an ipfs address with a
 * malformed CID. Other schemes pass through unchanged, for `fetchResource` to reject.
 */
function resolveMetadataUri(uri: string): string {
    const url = parseUrl(uri);
    if (!url) return '';
    return url.protocol === IPFS_PROTOCOL ? resolveIpfsUri(url) : uri;
}

/**
 * Reads one mint's off-chain JSON to find its logo, bounded by `METAPLEX_TIMEOUT_MS` and by
 * whatever is left of the batch's `deadline`.
 *
 * A mint's `uri` is attacker-controlled on-chain data, so this calls the metadata proxy's
 * `fetchResource` in process rather than requesting `/api/metadata/proxy` over HTTP. Same
 * hardening — per-hop private-IP rejection, protocol and redirect validation, size cap — with
 * no round trip, and nothing derived from the incoming request's host.
 *
 * Resolves to `null`, not `undefined`, because `TokenInfo.logoURI` is `string | null` in the
 * UTL REST contract and this value is serialised straight into it.
 */
async function fetchLogoUri(
    metadata: Metadata,
    deadline: number,
    options: FetchTokenInfosMetaplexOptions,
): Promise<string | null> {
    // Covers a mint with no `uri` at all, as well as one naming nothing readable.
    const uri = resolveMetadataUri(metadata.uri);
    // eslint-disable-next-line unicorn/no-null -- `TokenInfo.logoURI` is `string | null` per the UTL contract
    if (!uri) return null;

    const timeout = Math.min(METAPLEX_TIMEOUT_MS, deadline - Date.now());
    // The batch has spent its budget; the mints still queued give up their logo rather than the
    // request giving up its response.
    // eslint-disable-next-line unicorn/no-null -- same contract as above
    if (timeout <= 0) return null;

    try {
        const { data, headers } = await fetchResource(uri, {
            headers: new Headers({ 'User-Agent': USER_AGENT }),
            size: MAX_SIZE,
            timeout,
        });
        // eslint-disable-next-line unicorn/no-null -- same contract as above
        if (!matchJsonContent(headers.get('content-type'))) return null;
        const image = (data as { image?: unknown } | undefined)?.image;
        // eslint-disable-next-line unicorn/no-null -- same contract as above
        return typeof image === 'string' ? image : null;
    } catch (error) {
        // A dead link, a slow host, or a blocked address is routine for third-party metadata.
        options.onError?.(error);
        // eslint-disable-next-line unicorn/no-null -- same contract as above
        return null;
    }
}

/**
 * Resolves token info from on-chain Metaplex metadata. Use this for mints the
 * unified token list (UTL) API does not carry.
 *
 * This replaces the Metaplex fallback in `@solflare-wallet/utl-sdk`. Like the
 * SDK it returns only mints whose token standard is `Fungible`, and it marks
 * every result unverified because the data is not on a curated list.
 */
export async function getTokenInfosFromMetaplex(
    addresses: string[],
    rpcEndpoint: string,
    options: FetchTokenInfosMetaplexOptions = {},
): Promise<TokenInfo[]> {
    if (addresses.length === 0 || !rpcEndpoint) return [];

    let fungible: Metadata[];
    try {
        const umi = getUmi(rpcEndpoint);
        const pdas = addresses.map(address => findMetadataPda(umi, { mint: publicKey(address) }));

        // Umi sends every key in a single `getMultipleAccounts` call, so batch here to stay under
        // the RPC limit. One failed batch must not lose the mints the others resolved.
        const batches = await Promise.all(
            chunk(pdas, ACCOUNTS_CHUNK_SIZE).map(async batch => {
                try {
                    return await safeFetchAllMetadata(umi, batch);
                } catch (error) {
                    options.onError?.(error);
                    return [];
                }
            }),
        );

        fungible = batches.flat().filter(metadata => unwrapOption(metadata.tokenStandard) === TokenStandard.Fungible);
    } catch (error) {
        options.onError?.(error);
        return [];
    }

    if (fungible.length === 0) return [];

    const deadline = Date.now() + LOGO_BUDGET_MS;

    const [decimals, logoUris] = await Promise.all([
        fetchDecimals(
            fungible.map(metadata => metadata.mint.toString()),
            rpcEndpoint,
            options.onError,
        ),
        // `fetchAll` runs at most `LOGO_CONCURRENCY` reads at a time and keeps the results in the
        // order the mints were given, so `logoUris[index]` below still belongs to `fungible[index]`.
        fetchAll(fungible, metadata => fetchLogoUri(metadata, deadline, options), LOGO_CONCURRENCY),
    ]);

    return fungible.map((metadata, index) => ({
        address: metadata.mint.toString(),
        decimals: decimals.get(metadata.mint.toString()) ?? DEFAULT_DECIMALS,
        logoURI: logoUris[index],
        name: removeEmptyChars(metadata.name),
        symbol: removeEmptyChars(metadata.symbol),
        verified: false,
    }));
}
