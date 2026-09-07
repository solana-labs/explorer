import {
    createAbortSignal,
    getChainId,
    getTokenInfos,
    getTokenInfosFromMetaplex,
    isValidCluster,
    type TokenInfo,
} from '@entities/token-info/server';
import { isAddress } from '@solana/kit';
import { Cluster, serverClusterUrl } from '@utils/cluster';
import { NextResponse } from 'next/server';
import { array, boolean, type Infer, is, number, optional, refine, string, type } from 'superstruct';

import { Logger } from '@/app/shared/lib/logger';

import { CACHE_MAX_AGE, MAX_ADDRESSES } from './config';

// Platform backstop. One invocation is the UTL list lookup, then the on-chain fallback's
// chunked RPC reads, then the off-chain logo reads — already bounded as a group by
// `LOGO_BUDGET_MS`. Headroom, not a limit the fallback can hit. Kept inline: Next reads
// route segment config only as literal route exports.
export const maxDuration = 30;

const AddressStruct = refine(string(), 'address', value => isAddress(value));

/**
 * An accepted request body; unknown keys are ignored.
 *
 * Two rules stay outside the struct because they are not shape checks: `cluster` is validated
 * here only as a number, since `isValidCluster` decides whether it resolves a chain id, and the
 * address cap applies after de-duplication.
 */
const RequestStruct = type({
    address: optional(AddressStruct),
    addresses: optional(array(AddressStruct)),
    cluster: number(),
    genesisHash: optional(string()),
    includeOnChainFallback: optional(boolean()),
});

type RequestBody = Infer<typeof RequestStruct>;

export async function POST(request: Request) {
    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return invalidRequest();
    }

    if (!is(payload, RequestStruct)) return invalidRequest();

    const { cluster, genesisHash, includeOnChainFallback } = payload;
    const addresses = distinctAddresses(payload);

    if (!addresses || !isValidCluster(cluster, genesisHash)) {
        return invalidRequest();
    }

    if (addresses.length === 0) {
        return NextResponse.json({ content: [] });
    }

    // Allow to resolve chainId with genesisHash as the request does not use Connection instance
    // For requests that use Connection, Custom cluster should be disabled
    let upstreamError: unknown;
    const listed = await getTokenInfos(addresses, cluster, genesisHash, {
        next: { revalidate: CACHE_MAX_AGE },
        onError: error => {
            upstreamError = error;
        },
        // The upstream call is otherwise unbounded, and `maxDuration` is a much blunter backstop.
        signal: createAbortSignal(),
    });

    // `getTokenInfos` reports a partial drop and a total outage through the same hook, and answers
    // `[]` for an outage and for a genuine all-not-found alike. Nothing resolved plus an error is
    // the outage: answer 4xx/5xx so it is not cached, and so callers can tell it from "not listed"
    // instead of rendering an empty list as though the list had spoken.
    if (upstreamError !== undefined && listed.length === 0) {
        Logger.error(new Error('[api:token-info] List lookup resolved nothing', { cause: upstreamError }), {
            sentry: true,
            sentryExtras: { addressCount: addresses.length, chainId: getChainId(cluster, genesisHash), cluster },
        });
        return upstreamUnavailable();
    }

    if (upstreamError !== undefined) {
        Logger.warn('[api:token-info] List lookup dropped some tokens', {
            sentry: true,
            sentryExtras: { addressCount: addresses.length, cluster, resolved: listed.length },
        });
    }

    // Opt-in: only the batch path used to get the SDK's on-chain fallback, so
    // single-mint callers keep paying for the list lookup alone.
    const tokens = includeOnChainFallback === true ? await withMetaplexFallback(listed, addresses, cluster) : listed;

    // `content` is always an array; single-address callers read `content[0]`.
    return NextResponse.json({ content: tokens });
}

function invalidRequest() {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

function upstreamUnavailable() {
    return NextResponse.json({ error: 'Token list unavailable' }, { status: 503 });
}

/**
 * Reads the requested mints. Accepts a single `address` or an `addresses`
 * array; `address` is kept for the callers that resolve one mint at a time.
 * Answers `undefined` when neither is given, or when the request names more
 * distinct mints than `MAX_ADDRESSES`.
 */
function distinctAddresses({ address, addresses }: RequestBody): string[] | undefined {
    const requested = addresses ?? (address === undefined ? undefined : [address]);
    if (!requested) return undefined;

    // De-duplicate before the cap: one transaction often moves the same mint through several token
    // accounts, and a repeated mint costs one lookup rather than a slot against the limit.
    const unique = Array.from(new Set(requested));
    return unique.length > MAX_ADDRESSES ? undefined : unique;
}

/**
 * Fills in mints the UTL list does not carry by reading their on-chain Metaplex
 * metadata. The fallback is best-effort: a failure here still returns the
 * listed tokens.
 */
async function withMetaplexFallback(listed: TokenInfo[], addresses: string[], cluster: Cluster): Promise<TokenInfo[]> {
    const found = new Set(listed.map(token => token.address));
    const missing = addresses.filter(address => !found.has(address));
    if (missing.length === 0) return listed;

    // Resolved server-side on purpose: forwarding the browser's RPC URL would let any caller
    // point this route at an arbitrary host.
    //
    // The cost is `Cluster.Custom`, whose endpoint only the browser knows, so the on-chain
    // fallback is skipped. No regression: a custom cluster has no chain id unless the caller
    // supplies a matching `genesisHash`, and neither `TokenBalancesCard` nor `TokensProvider`
    // does, so `getTokenInfos` already returned nothing there. Where a chain id does resolve,
    // the UTL list is still served — only the on-chain fallback is dropped.
    if (cluster === Cluster.Custom) return listed;

    // `!rpcEndpoint` still guards a `*_RPC_URL` env var set to `""`, which survives the `??`
    // fallback in `serverClusterUrl`.
    const rpcEndpoint = serverClusterUrl(cluster);
    if (!rpcEndpoint) return listed;

    try {
        const onChain = await getTokenInfosFromMetaplex(missing, rpcEndpoint, {
            onError: error => Logger.warn('[api:token-info] Metaplex lookup failed', { error }),
        });
        return [...listed, ...onChain];
    } catch (error) {
        Logger.warn('[api:token-info] Metaplex fallback failed', { error });
        return listed;
    }
}
