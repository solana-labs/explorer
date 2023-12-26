'use client';

import { ProgramInterfaceCard } from '@/app/components/account/ProgramInterfaceCard';
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
        <Suspense fallback={<LoadingCard message="Looking up MSA instructions in the anchor IDL" />}>
            <ProgramInterfaceCard programId={account.pubkey.toString()} />
        </Suspense>
    );
}

export default function AnchorAccountPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={AnchorAccountCardRenderer} />;
}
