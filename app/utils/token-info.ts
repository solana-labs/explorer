import { Connection, PublicKey } from "@solana/web3.js";
import { ChainId, Client, Token, UtlConfig } from "@solflare-wallet/utl-sdk";

import { Cluster } from "./cluster";

type TokenExtensions = {
    readonly website?: string,
    readonly bridgeContract?: string,
    readonly assetContract?: string,
    readonly address?: string,
    readonly explorer?: string,
    readonly twitter?: string,
    readonly github?: string,
    readonly medium?: string,
    readonly tgann?: string,
    readonly tggroup?: string,
    readonly discord?: string,
    readonly serumV3Usdt?: string,
    readonly serumV3Usdc?: string,
    readonly coingeckoId?: string,
    readonly imageUrl?: string,
    readonly description?: string,
}
export type FullLegacyTokenInfo = {
    readonly chainId: number,
    readonly address: string,
    readonly name: string,
    readonly decimals: number,
    readonly symbol: string,
    readonly logoURI?: string,
    readonly tags?: string[],
    readonly extensions?: TokenExtensions,
}

type FullLegacyTokenInfoList = {
    tokens: FullLegacyTokenInfo[]
}

function getChainId(cluster: Cluster): ChainId | undefined {
    if (cluster === Cluster.MainnetBeta) return ChainId.MAINNET;
    else if (cluster === Cluster.Testnet) return ChainId.TESTNET;
    else if (cluster === Cluster.Devnet) return ChainId.DEVNET;
    else return undefined;
}

function makeUtlClient(
    cluster: Cluster,
    connectionString: string
): Client | undefined {
    const chainId = getChainId(cluster);
    if (!chainId) return undefined;

    const config: UtlConfig = new UtlConfig({
        chainId,
        connection: new Connection(connectionString),
    })

    return new Client(config);
}

export async function getTokenInfo(
    address: PublicKey,
    cluster: Cluster,
    connectionString: string
): Promise<Token | undefined> {
    const client = makeUtlClient(cluster, connectionString);
    if (!client) return Promise.resolve(undefined);
    const token = await client.fetchMint(address);
    return token;
}

/**
 * Get the full token info from a CDN with the legacy token list
 * The UTL SDK only returns the most common fields, we sometimes need eg extensions
 * @param address Public key of the token
 * @param cluster Cluster to fetch the token info for
 */
export async function getFullLegacyTokenInfoUsingCdn(
    address: PublicKey,
    cluster: Cluster,
    connectionString: string
): Promise<FullLegacyTokenInfo | undefined> {
    const chainId = getChainId(cluster);
    if (!chainId) return undefined;

    // We use the solana-labs token-list from CDN
    // We can't use the solflare one because it only includes the coinGeckoId extension
    const tokenListResponse = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@latest/src/tokens/solana.tokenlist.json');
    if (tokenListResponse.status >= 400) {
        reportError(new Error('Error fetching token list from CDN'));
        return undefined;
    }
    const { tokens } = await tokenListResponse.json() as FullLegacyTokenInfoList;
    const tokenInfo = tokens.find(t => t.address === address.toString() && t.chainId === chainId)
    if (tokenInfo) return tokenInfo;

    // If it wasn't in the CDN, fetch it from the SDK
    // This won't have all the fields, but return what we can
    const sdkTokenInfo = await getTokenInfo(address, cluster, connectionString);
    if (!sdkTokenInfo) return undefined;

    return {
        address: sdkTokenInfo.address,
        chainId,
        decimals: sdkTokenInfo.decimals ?? 0,
        logoURI: sdkTokenInfo.logoURI ?? undefined,
        name: sdkTokenInfo.name,
        symbol: sdkTokenInfo.symbol,
        tags: sdkTokenInfo.tags ? Array.from(sdkTokenInfo.tags) : [],
    }
}

export async function getTokenInfos(
    addresses: PublicKey[],
    cluster: Cluster,
    connectionString: string
): Promise<Token[] | undefined> {
    const client = makeUtlClient(cluster, connectionString);
    if (!client) return Promise.resolve(undefined);
    const tokens = await client.fetchMints(addresses);
    return tokens;
}
