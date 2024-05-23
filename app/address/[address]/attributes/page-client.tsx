'use client';

import { MetaplexNFTAttributesCard } from '@components/account/MetaplexNFTAttributesCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React, { Suspense } from 'react';

import { LoadingCard } from '@/app/components/common/LoadingCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function MetaplexNFTAttributesCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    return (
        <Suspense fallback={<LoadingCard />}>
            {<MetaplexNFTAttributesCard account={account} onNotFound={onNotFound} />}
        </Suspense>
    );
}

export default function MetaplexNFTAttributesPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={MetaplexNFTAttributesCardRenderer} />;
}
