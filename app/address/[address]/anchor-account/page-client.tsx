'use client';

import { AnchorAccountCard } from '@components/account/AnchorAccountCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { LoadingCard } from '@components/common/LoadingCard';
import { Suspense } from 'react';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function AnchorAccountCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    if (!account) {
        return onNotFound();
    }
    return (
        <Suspense fallback={<LoadingCard message="Decoding account data using anchor interface" />}>
            <AnchorAccountCard account={account} />
        </Suspense>
    );
}

export default function AnchorAccountPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={AnchorAccountCardRenderer} />;
}
