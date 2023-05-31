import {Strategy, TokenInfo, TokenInfoMap} from "@solana/spl-token-registry";
import {Cluster} from "@utils/cluster";
import getTokenList from "@utils/get-token-list";


export type AddressPageMetadataProps = Readonly<{
    params: {
        address: string;
    };
    searchParams: {
        cluster: string;
    };
}>;

export default async function getReadableTitleFromAddress(props: AddressPageMetadataProps): Promise<string> {
    const { params: { address }, searchParams: { cluster } } = props

    // Get cluster from URL querystring (e.g. `?cluster=devnet`). If nothing is found, default to mainnet-beta.
    let parsedCluster = Cluster.MainnetBeta
    if (cluster === 'devnet') parsedCluster = Cluster.Devnet
    else if (cluster === 'testnet') parsedCluster = Cluster.Testnet
    else if (cluster === 'custom') parsedCluster = Cluster.Custom

    return await getTokenList(parsedCluster, Strategy.Solana)
        .then((tokens: TokenInfoMap) => {
            if (typeof tokens.get(address)?.name === 'undefined') throw new Error('invalid token address')
            return `Token | ${(tokens.get(address) as TokenInfo).name}`
        })
        .catch(() => address) // fallback to address if token not found
}