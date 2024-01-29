'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { LoadingCard } from '@components/common/LoadingCard';
import { Suspense } from 'react';
import React from 'react';

import { SplTokenMetadataInterfaceCard } from '@/app/components/account/SplTokenMetadataInterfaceCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function SplTokenMetadataInterfaceCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    if (!account) {
        return onNotFound();
    }
    return (
        <Suspense fallback={<LoadingCard message="Looking up MSA instructions in the anchor IDL" />}>
            <SplTokenMetadataInterfaceCard mint={account.pubkey.toString()} />
        </Suspense>
    );
}

export default function SplTokenMetadataInterfacePageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={SplTokenMetadataInterfaceCardRenderer} />;
}
