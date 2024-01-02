import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import ProgramInterfacePageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Human usable Solana actions for the program at address ${props.params.address} on Solana`,
        title: `Program Interface | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function ProgramInterfacePage(props: Props) {
    return <ProgramInterfacePageClient {...props} />;
}
