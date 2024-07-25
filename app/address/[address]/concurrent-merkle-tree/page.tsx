import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import ConcurrentMerkleTreePageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Contents of the SPL Concurrent Merkle Tree at address ${props.params.address}`,
        title: `Concurrent Merkle Tree | ${await getReadableTitleFromAddress(props)} | Zuma`,
    };
}

export default function ConcurrentMerkleTreePage(props: Props) {
    return <ConcurrentMerkleTreePageClient {...props} />;
}
