'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React from 'react';

import { VerifiedBuildCard } from '@/app/components/account/VerifiedBuildCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function VerifiedBuildCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const parsedData = account?.data?.parsed;
    if (!parsedData || parsedData?.program !== 'bpf-upgradeable-loader') {
        return onNotFound();
    }
    return <VerifiedBuildCard data={parsedData} pubkey={account.pubkey} />;
}

export default function VerifiedBuildPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={VerifiedBuildCardRenderer} />;
}
