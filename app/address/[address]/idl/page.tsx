import { LoadingCard } from '@components/common/LoadingCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';
import { Suspense } from 'react';

import { IdlCard } from '@/app/components/account/IdlCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `The Interface Definition Language (IDL) file for the program at address ${props.params.address} on Solana`,
        title: `Program IDL | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function AnchorProgramIDLPage({ params: { address } }: Props) {
    return (
        <Suspense fallback={<LoadingCard message="Loading program IDL" />}>
            <IdlCard programId={address} />
        </Suspense>
    );
}
