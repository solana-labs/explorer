import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import NiftyAssetRuleSetPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Royalties Rule Set for the asset with address ${props.params.address} on Solana`,
        title: `Rule Set for Asset | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function MetaplexNFTMetadataPage(props: Props) {
    return <NiftyAssetRuleSetPageClient {...props} />;
}
