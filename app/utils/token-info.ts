import { Connection, PublicKey } from '@solana/web3.js';
import { ChainId, Client, Token, UtlConfig } from '@solflare-wallet/utl-sdk';

import { Cluster } from './cluster';

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

function getChainId(cluster: Cluster): ChainId | undefined {
    if (cluster === Cluster.MainnetBeta) return ChainId.MAINNET;
    else if (cluster === Cluster.Testnet) return ChainId.TESTNET;
    else if (cluster === Cluster.Devnet) return ChainId.DEVNET;
    else return undefined;
}

function makeUtlClient(cluster: Cluster, connectionString: string): Client | undefined {
    const chainId = getChainId(cluster);
    if (!chainId) return undefined;

    const config: UtlConfig = new UtlConfig({
        chainId,
        connection: new Connection(connectionString),
    });

    return new Client(config);
}

export function getTokenInfoSwrKey(address: string, cluster: Cluster, connectionString: string) {
    return ['get-token-info', address, cluster, connectionString];
}

export async function getTokenInfo(
    address: PublicKey,
    cluster: Cluster,
    connectionString: string
): Promise<Token | undefined> {
    const client = makeUtlClient(cluster, connectionString);
    if (!client) return undefined;
    const token = await client.fetchMint(address);
    return token;
}

type UtlApiResponse = {
    content: Token[]
}

export async function getTokenInfoWithoutOnChainFallback(
    address: PublicKey,
    cluster: Cluster
): Promise<Token | undefined> {
    const chainId = getChainId(cluster);
    if (!chainId) return undefined;

    // Request token info directly from UTL API
    // We don't use the SDK here because we don't want it to fallback to an on-chain request
    const response = await fetch(`https://token-list-api.solana.cloud/v1/mints?chainId=${chainId}`, {
        body: JSON.stringify({ addresses: [address.toBase58()] }),
        headers: {
            "Content-Type": "application/json",
        },
        method: 'POST',
    })

    if (response.status >= 400) {
        console.error(`Error calling UTL API for address ${address} on chain ID ${chainId}. Status ${response.status}`);
        return undefined
    }

    const fetchedData = await response.json() as UtlApiResponse;
    return fetchedData.content[0];
}

async function getFullLegacyTokenInfoUsingCdn(
    address: PublicKey,
    chainId: ChainId
): Promise<FullLegacyTokenInfo | undefined> {
    const tokenListResponse = await fetch(
        'https://cdn.jsdelivr.net/gh/solana-labs/token-list@latest/src/tokens/solana.tokenlist.json'
    );
    if (tokenListResponse.status >= 400) {
        console.error(new Error('Error fetching token list from CDN'));
        return undefined;
    }
    const { tokens } = (await tokenListResponse.json()) as FullLegacyTokenInfoList;
    const tokenInfo = tokens.find(t => t.address === address.toString() && t.chainId === chainId);
    return tokenInfo;
}

/**
 * Get the full token info from a CDN with the legacy token list
 * The UTL SDK only returns the most common fields, we sometimes need eg extensions
 * @param address Public key of the token
 * @param cluster Cluster to fetch the token info for
 */
export async function getFullTokenInfo(
    address: PublicKey,
    cluster: Cluster,
    connectionString: string
): Promise<FullTokenInfo | undefined> {
    const chainId = getChainId(cluster);
    if (!chainId) return undefined;

    const [legacyCdnTokenInfo, sdkTokenInfo] = await Promise.all([
        getFullLegacyTokenInfoUsingCdn(address, chainId),
        getTokenInfo(address, cluster, connectionString),
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
        extensions: legacyCdnTokenInfo?.extensions,
        logoURI: sdkTokenInfo.logoURI ?? undefined,
        name: sdkTokenInfo.name,
        symbol: sdkTokenInfo.symbol,
        tags,
        verified: sdkTokenInfo.verified ?? false,
    };
}

export async function getTokenInfos(
    addresses: PublicKey[],
    cluster: Cluster,
    connectionString: string
): Promise<Token[] | undefined> {
    const client = makeUtlClient(cluster, connectionString);
    if (!client) return undefined;
    const tokens = await client.fetchMints(addresses);
    return tokens;
}
