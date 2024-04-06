import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import CoreNFTMetadataPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Metadata for the Core NFT with address ${props.params.address} on Solana`,
        title: `Core NFT Metadata | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function CoreNFTMetadataPage(props: Props) {
    return <CoreNFTMetadataPageClient {...props} />;
}
