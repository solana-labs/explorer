import { PublicKey } from '@solana/web3.js';
import { clusters } from '@utils/cluster';

import { getTokenInfo } from './token-info';

export type AddressPageMetadataProps = Readonly<{
    params: {
        address: string;
    };
    searchParams: {
        cluster: string;
        customUrl?: string;
    };
}>;

export default async function getReadableTitleFromAddress(props: AddressPageMetadataProps): Promise<string> {
    const {
        params: { address },
        searchParams: { cluster: clusterParam },
    } = props;

    const cluster = clusters.get(clusterParam) || clusters.default;

    try {
        const url = cluster.uri;
        const tokenInfo = await getTokenInfo(new PublicKey(address), cluster, url);
        const tokenName = tokenInfo?.name;

        if (tokenName == null) {
            return address;
        }
        const tokenDisplayAddress = address.slice(0, 2) + '\u2026' + address.slice(-2);
        return `Token | ${tokenName} (${tokenDisplayAddress})`;
    } catch {
        return address;
    }
}
