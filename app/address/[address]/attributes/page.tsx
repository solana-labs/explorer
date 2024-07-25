import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import NFTAttributesPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Attributes of the Metaplex NFT with address ${props.params.address}`,
        title: `Metaplex NFT Attributes | ${await getReadableTitleFromAddress(props)} | Zuma`,
    };
}

export default function MetaplexNFTAttributesPage(props: Props) {
    return <NFTAttributesPageClient {...props} />;
}
