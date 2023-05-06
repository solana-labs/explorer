'use client';

import { MetaplexNFTAttributesCard } from '@components/account/MetaplexNFTAttributesCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function MetaplexNFTAttributesCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const parsedData = account?.data?.parsed;
    if (!parsedData || parsedData.program !== 'spl-token' || parsedData.parsed.type !== 'mint' || !parsedData.nftData) {
        return onNotFound();
    }
    return <MetaplexNFTAttributesCard nftData={parsedData.nftData} />;
}

export default function MetaplexNFTAttributesPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={MetaplexNFTAttributesCardRenderer} />;
}
