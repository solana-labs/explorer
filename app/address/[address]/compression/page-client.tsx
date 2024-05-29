'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React, { Suspense } from 'react';

import { CompressedNFTInfoCard } from '@/app/components/account/CompressedNFTInfoCard';
import { LoadingCard } from '@/app/components/common/LoadingCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function CompressionCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    return (
        <Suspense fallback={<LoadingCard />}>
            {<CompressedNFTInfoCard account={account} onNotFound={onNotFound} />}
        </Suspense>
    );
}

export default function CompressionPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={CompressionCardRenderer} />;
}
