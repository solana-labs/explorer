import { AnchorProgramCard } from '@components/account/AnchorProgramCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Metadata } from 'next/types';
import { Suspense } from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `The Interface Definition Language (IDL) file for the Anchor program at address ${address} on Solana`,
        title: `Anchor Program IDL | ${address} | Solana`,
    };
}

export default function AnchorProgramIDLPage({ params: { address } }: Props) {
    return (
        <Suspense fallback={<LoadingCard message="Loading anchor program IDL" />}>
            <AnchorProgramCard programId={address} />
        </Suspense>
    );
}
