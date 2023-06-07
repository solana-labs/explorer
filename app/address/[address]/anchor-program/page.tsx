import { AnchorProgramCard } from '@components/account/AnchorProgramCard';
import { LoadingCard } from '@components/common/LoadingCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';
import { Suspense } from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `The Interface Definition Language (IDL) file for the Anchor program at address ${props.params.address} on Solana`,
        title: `Anchor Program IDL | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function AnchorProgramIDLPage({ params: { address } }: Props) {
    return (
        <Suspense fallback={<LoadingCard message="Loading anchor program IDL" />}>
            <AnchorProgramCard programId={address} />
        </Suspense>
    );
}
