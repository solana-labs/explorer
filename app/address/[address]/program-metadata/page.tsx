import { LoadingCard } from '@components/common/LoadingCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';
import { Suspense } from 'react';

import { ProgramMetadataCard } from '@/app/components/account/ProgramMetadataCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `This is the meta data uploaded by the program authority for program ${props.params.address} on Solana`,
        title: `Program Metadata | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function ProgramMetadataPage({ params: { address } }: Props) {
    return (
        <Suspense fallback={<LoadingCard message="Loading program metadata" />}>
            <ProgramMetadataCard programId={address} />
        </Suspense>
    );
}
