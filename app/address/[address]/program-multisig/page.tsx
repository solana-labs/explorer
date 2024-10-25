import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import ProgramMultisigPageClient from './page-client';

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Multisig information for the upgrade authority of the program with address ${props.params.address} on Solana`,
        title: `Upgrade Authority Multisig | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export default function ProgramMultisigPage(props: Props) {
    return <ProgramMultisigPageClient {...props} />;
}
