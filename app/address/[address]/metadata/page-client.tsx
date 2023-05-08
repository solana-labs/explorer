'use client';

import { MetaplexMetadataCard } from '@components/account/MetaplexMetadataCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function MetaplexMetadataCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const parsedData = account?.data?.parsed;
    if (!parsedData || parsedData.program !== 'spl-token' || parsedData.parsed.type !== 'mint' || !parsedData.nftData) {
        return onNotFound();
    }
    return <MetaplexMetadataCard nftData={parsedData.nftData} />;
}

export default function MetaplexNFTMetadataPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={MetaplexMetadataCardRenderer} />;
}
