import { Strategy } from '@solana/spl-token-registry';
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
        searchParams: { cluster: clusterParam },
    } = props;

    let cluster: Cluster;
    switch (clusterParam) {
        case 'custom':
            cluster = Cluster.Custom;
            break;
        case 'devnet':
            cluster = Cluster.Devnet;
            break;
        case 'testnet':
            cluster = Cluster.Testnet;
            break;
        default:
            cluster = Cluster.MainnetBeta;
    }

    try {
        const tokenList = await getTokenList(cluster, Strategy.Solana);
        const tokenName = tokenList.get(address)?.name;
        if (tokenName == null) {
            return address;
        }
        const tokenDisplayAddress = address.slice(0, 2) + '\u2026' + address.slice(-2);
        return `Token | ${tokenName} (${tokenDisplayAddress})`;
    } catch {
        return address;
    }
}
