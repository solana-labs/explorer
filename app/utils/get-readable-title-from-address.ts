import { Strategy, TokenInfo } from '@solana/spl-token-registry';
import { Cluster } from '@utils/cluster';
import getTokenList from '@utils/get-token-list';

export type AddressPageMetadataProps = Readonly<{
    params: {
        address: string;
    };
    searchParams: {
        cluster: string;
    };
}>;

export default async function getReadableTitleFromAddress(props: AddressPageMetadataProps): Promise<string> {
    const {
        params: { address },
        searchParams: { cluster },
    } = props;

    // Get cluster from URL querystring (e.g. `?cluster=devnet`). If nothing is found, default to mainnet-beta.
    let parsedCluster = Cluster.MainnetBeta;
    if (cluster === 'devnet') parsedCluster = Cluster.Devnet;
    else if (cluster === 'testnet') parsedCluster = Cluster.Testnet;
    else if (cluster === 'custom') parsedCluster = Cluster.Custom;

    try {
        const tokenList = await getTokenList(parsedCluster, Strategy.Solana);
        if (typeof tokenList.get(address)?.name === 'undefined') {
            console.log(tokenList.get(address))
            return address;
        }

        const tokenName = (tokenList.get(address) as TokenInfo).name;
        const tokenAddressBlob = address.slice(0, 2) + '...' + address.slice(-2);

        return `Token | ${tokenName} (${tokenAddressBlob})`;
    } catch {
        return address;
    }
}
