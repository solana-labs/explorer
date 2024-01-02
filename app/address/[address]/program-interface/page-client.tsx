'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { LoadingCard } from '@components/common/LoadingCard';
import { Suspense } from 'react';
import React from 'react';

import { ProgramInterfaceCard } from '@/app/components/account/ProgramInterfaceCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function ProgramInterfaceCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    if (!account) {
        return onNotFound();
    }
    return (
        <Suspense fallback={<LoadingCard message="Looking up MSA instructions in the anchor IDL" />}>
            <ProgramInterfaceCard programId={account.pubkey.toString()} />
        </Suspense>
    );
}

export default function ProgramInterfacePageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={ProgramInterfaceCardRenderer} />;
}
