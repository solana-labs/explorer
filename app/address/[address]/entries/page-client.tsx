'use client';

import { LookupTableEntriesCard } from '@components/account/address-lookup-table/LookupTableEntriesCard';
import { isAddressLookupTableAccount } from '@components/account/address-lookup-table/types';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import React from 'react';
import { Base58EncodedAddress } from 'web3js-experimental';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function AddressLookupTableEntriesRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const parsedData = account?.data.parsed;
    const rawData = account?.data.raw;
    if (parsedData && parsedData.program === 'address-lookup-table' && parsedData.parsed.type === 'lookupTable') {
        return <LookupTableEntriesCard parsedLookupTable={parsedData.parsed.info} />;
    } else if (rawData && isAddressLookupTableAccount(account.owner.toBase58() as Base58EncodedAddress, rawData)) {
        return <LookupTableEntriesCard lookupTableAccountData={rawData} />;
    } else {
        return onNotFound();
    }
}

export default function AddressLookupTableEntriesPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={AddressLookupTableEntriesRenderer} />;
}
