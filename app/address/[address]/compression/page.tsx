import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import CompressionPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Information about the Compressed NFT with address ${props.params.address}`,
        title: `Compression Information | ${await getReadableTitleFromAddress(props)} | Zuma`,
    };
}

export default function CompressionPage(props: Props) {
    return <CompressionPageClient {...props} />;
}
