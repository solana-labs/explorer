'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { TokenAuthRulesCard } from '@components/account/TokenAuthRulesCard';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function TokenAuthRulesCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const data = account?.data?.raw;
    if (!data || account.owner.toBase58() !== 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg') {
        return onNotFound();
    }
    return <TokenAuthRulesCard data={data} />;
}

export default function MetaplexNFTMetadataPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={TokenAuthRulesCardRenderer} />;
}
