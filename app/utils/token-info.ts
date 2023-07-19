import { Connection, PublicKey } from "@solana/web3.js";
import { ChainId, Client, Token, UtlConfig } from "@solflare-wallet/utl-sdk";
import { Base58EncodedAddress } from "web3js-experimental";

import { Cluster } from "./cluster";

function makeUtlClient(
    cluster: Cluster,
    connectionString: string
) {
    let chainId: ChainId;
    if (cluster === Cluster.MainnetBeta) chainId = ChainId.MAINNET;
    else if (cluster === Cluster.Testnet) chainId = ChainId.TESTNET;
    else if (cluster === Cluster.Devnet) chainId = ChainId.DEVNET;
    else { return undefined; }

    const config: UtlConfig = new UtlConfig({
        chainId,
        connection: new Connection(connectionString),
    })

    return new Client(config);
}

export async function getTokenInfo(
    address: Base58EncodedAddress,
    cluster: Cluster,
    connectionString: string
): Promise<Token | undefined> {
    const client = makeUtlClient(cluster, connectionString);
    if (!client) return Promise.resolve(undefined);
    const token = await client.fetchMint(new PublicKey(address));
    return token;
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
