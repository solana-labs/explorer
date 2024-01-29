import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import SplTokenMetadataInterfacePageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `SPL token metadata for ${props.params.address} on Solana`,
        title: `SPL Token Metadata | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function SplTokenMetadataInterfacePage(props: Props) {
    return <SplTokenMetadataInterfacePageClient {...props} />;
}
