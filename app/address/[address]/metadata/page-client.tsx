'use client';

import { MetaplexMetadataCard } from '@components/account/MetaplexMetadataCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React, { Suspense } from 'react';

import { LoadingCard } from '@/app/components/common/LoadingCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function MetaplexMetadataCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    return (
        <Suspense fallback={<LoadingCard />}>
            {<MetaplexMetadataCard account={account} onNotFound={onNotFound} />}
        </Suspense>
    );
}

export default function MetaplexNFTMetadataPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={MetaplexMetadataCardRenderer} />;
}
