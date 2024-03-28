import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import NiftyAssetExtensionsPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Extensions for the asset with address ${props.params.address} on Solana`,
        title: `Asset Extensions | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function MetaplexNFTMetadataPage(props: Props) {
    return <NiftyAssetExtensionsPageClient {...props} />;
}
