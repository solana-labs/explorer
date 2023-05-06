'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { SecurityCard } from '@components/account/SecurityCard';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function SecurityCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const parsedData = account?.data?.parsed;
    if (!parsedData || parsedData?.program !== 'bpf-upgradeable-loader') {
        return onNotFound();
    }
    return <SecurityCard data={parsedData} />;
}

export default function SecurityPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={SecurityCardRenderer} />;
}
