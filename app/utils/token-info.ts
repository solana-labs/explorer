import { ChainId } from '@entities/chain-id';
import { getChainId, type TokenInfo } from '@entities/token-info';
import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { TokenExtension } from '@validators/accounts/token-extension';

import { Logger } from '@/app/shared/lib/logger';

type TokenExtensions = {
    readonly website?: string;
    readonly bridgeContract?: string;
    readonly assetContract?: string;
    readonly address?: string;
    readonly explorer?: string;
    readonly twitter?: string;
    readonly github?: string;
    readonly medium?: string;
    readonly tgann?: string;
    readonly tggroup?: string;
    readonly discord?: string;
    readonly serumV3Usdt?: string;
    readonly serumV3Usdc?: string;
    readonly coingeckoId?: string;
    readonly imageUrl?: string;
    readonly description?: string;
};
export type FullLegacyTokenInfo = {
    readonly chainId: number;
    readonly address: string;
    readonly name: string;
    readonly decimals: number;
    readonly symbol: string;
    readonly logoURI?: string;
    readonly tags?: string[];
    readonly extensions?: TokenExtensions;
};
export type FullTokenInfo = FullLegacyTokenInfo & {
    readonly verified: boolean;
};

type FullLegacyTokenInfoList = {
    tokens: FullLegacyTokenInfo[];
};

type FetchTokenInfosRequest = {
    addresses: string[];
    cluster: Cluster;
    genesisHash: string | undefined;
    /**
     * Also read on-chain Metaplex metadata for mints the UTL list does not carry. Costs extra
     * RPC calls, so it is opt-in — and it lifts the route's own time budget, so a caller that
     * sets this wants a `signal` sized for that or none at all.
     */
    includeOnChainFallback: boolean;
    /** Without one the request waits as long as the platform allows. */
    signal?: AbortSignal;
};

/**
 * Resolves mints through the `/api/token-info` route. The route owns the UTL
 * list lookup and the RPC endpoint, so no RPC URL is sent from the browser.
 *
 * Answers `undefined` for every failure — no chain id, a non-2xx, a body that is not a token
 * array, an abort, a network error. Callers read that as "these mints did not resolve", which
 * is what lets one chunk of a longer list fail on its own.
 */
export async function fetchTokenInfosFromApi({
    addresses,
    cluster,
    genesisHash,
    includeOnChainFallback,
    signal,
}: FetchTokenInfosRequest): Promise<TokenInfo[] | undefined> {
    const chainId = getChainId(cluster, genesisHash);
    if (!chainId) return undefined;
    if (addresses.length === 0) return [];

    try {
        const response = await fetch('/api/token-info', {
            body: JSON.stringify({ addresses, cluster, genesisHash, includeOnChainFallback }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            signal,
        });

        if (!response.ok) {
            Logger.warn('[utils:token-info] Token info request rejected', {
                sentry: true,
                sentryExtras: { addressCount: addresses.length, cluster, status: response.status },
            });
            return undefined;
        }

        const { content } = (await response.json()) as { content?: unknown };
        // The route always answers with an array. Anything else means something between us and it
        // replied instead, and iterating it would throw where no caller expects a throw.
        if (!Array.isArray(content)) {
            Logger.warn('[utils:token-info] Token info response was not a token array', { sentry: true });
            return undefined;
        }

        return content as TokenInfo[];
    } catch (error) {
        Logger.error(new Error('[utils:token-info] Failed to fetch token info', { cause: error }), {
            sentry: true,
            sentryExtras: { addressCount: addresses.length, cluster },
        });
        return undefined;
    }
}

export function getTokenInfoSwrKey(address: string, cluster: Cluster, genesisHash?: string) {
    return ['get-token-info', address, cluster, genesisHash];
}

export async function getTokenInfo(
    address: PublicKey,
    cluster: Cluster,
    genesisHash?: string,
): Promise<TokenInfo | undefined> {
    return getTokenInfoWithoutOnChainFallback(address, cluster, genesisHash);
}

/**
 * @deprecated Use `getTokenInfo` instead.
 */
export async function getTokenInfoWithoutOnChainFallback(
    address: PublicKey,
    cluster: Cluster,
    genesisHash?: string,
): Promise<TokenInfo | undefined> {
    const tokens = await fetchTokenInfosFromApi({
        addresses: [address.toBase58()],
        cluster,
        genesisHash,
        includeOnChainFallback: false,
    });
    return tokens?.[0];
}

async function getFullLegacyTokenInfoUsingCdn(
    address: PublicKey,
    chainId: ChainId,
): Promise<FullLegacyTokenInfo | undefined> {
    const tokenListResponse = await fetch(
        'https://cdn.jsdelivr.net/gh/solana-labs/token-list@latest/src/tokens/solana.tokenlist.json',
    );
    if (tokenListResponse.status >= 400) {
        Logger.error(new Error('[utils:token-info] Error fetching token list from CDN'));
        return undefined;
    }
    const { tokens } = (await tokenListResponse.json()) as FullLegacyTokenInfoList;
    const tokenInfo = tokens.find(t => t.address === address.toString() && t.chainId === chainId);
    return tokenInfo;
}

export function isRedactedTokenAddress(address: string): boolean {
    return (
        process.env.NEXT_PUBLIC_BAD_TOKENS?.split(',')
            .map(addr => addr.trim())
            .includes(address) ?? false
    );
}

/**
 * Get the full token info from a CDN with the legacy token list
 * The UTL SDK only returns the most common fields, we sometimes need eg extensions
 * @param address Public key of the token
 * @param cluster Cluster to fetch the token info for
 * @param genesisHash Genesis hash for cluster identification (required for SIMD-296)
 */
export type FullTokenInfoSwrKey = ['get-full-token-info', string, Cluster, string, string | undefined];

export function getFullTokenInfoSwrKey(
    address: string,
    cluster: Cluster,
    url: string,
    genesisHash?: string,
): FullTokenInfoSwrKey {
    return ['get-full-token-info', address, cluster, url, genesisHash];
}

export async function fetchFullTokenInfo([_, pubkey, cluster, _url, genesisHash]: FullTokenInfoSwrKey) {
    return await getFullTokenInfo(new PublicKey(pubkey), cluster, genesisHash);
}

export async function getFullTokenInfo(
    address: PublicKey,
    cluster: Cluster,
    genesisHash?: string,
): Promise<FullTokenInfo | undefined> {
    if (isRedactedTokenAddress(address.toBase58())) {
        return undefined;
    }
    const chainId = getChainId(cluster, genesisHash);
    if (!chainId) return undefined;

    const [legacyCdnTokenInfo, sdkTokenInfo] = await Promise.all([
        getFullLegacyTokenInfoUsingCdn(address, chainId),
        getTokenInfo(address, cluster, genesisHash),
    ]);

    if (!sdkTokenInfo) {
        return legacyCdnTokenInfo
            ? {
                  ...legacyCdnTokenInfo,
                  verified: true,
              }
            : undefined;
    }
    // Merge the fields, prioritising the sdk ones which are more up to date
    let tags: string[] = [];
    if (sdkTokenInfo.tags) tags = Array.from(sdkTokenInfo.tags);
    else if (legacyCdnTokenInfo?.tags) tags = legacyCdnTokenInfo.tags;

    return {
        address: sdkTokenInfo.address,
        chainId,
        decimals: sdkTokenInfo.decimals ?? 0,
        extensions: legacyCdnTokenInfo?.extensions || (sdkTokenInfo as { extensions?: TokenExtensions })?.extensions,
        logoURI: sdkTokenInfo.logoURI ?? undefined,
        name: sdkTokenInfo.name,
        symbol: sdkTokenInfo.symbol,
        tags,
        verified: sdkTokenInfo.verified ?? false,
    };
}

/**
 * Resolves several mints at once. Matches what the UTL SDK's `fetchMints` did:
 * the UTL list first, then on-chain Metaplex metadata for whatever is missing.
 */
export async function getTokenInfos(
    addresses: PublicKey[],
    cluster: Cluster,
    genesisHash?: string,
): Promise<TokenInfo[] | undefined> {
    // No `signal`: the on-chain fallback runs RPC reads and off-chain logo fetches, so this
    // request is allowed the route's whole budget.
    return fetchTokenInfosFromApi({
        addresses: addresses.map(address => address.toBase58()),
        cluster,
        genesisHash,
        includeOnChainFallback: true,
    });
}

export function getCurrentTokenScaledUiAmountMultiplier(extensions: Array<TokenExtension> | undefined): string {
    const scaledUiAmountConfig = extensions?.find(extension => extension.extension === 'scaledUiAmountConfig');
    if (!scaledUiAmountConfig) {
        return '1';
    }
    const currentTimestamp = Math.floor(Date.now() / 1000);
    return currentTimestamp >= scaledUiAmountConfig.state.newMultiplierEffectiveTimestamp
        ? scaledUiAmountConfig.state.newMultiplier
        : scaledUiAmountConfig.state.multiplier;
}
