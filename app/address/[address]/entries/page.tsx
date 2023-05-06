import { Metadata } from 'next/types';

import AddressLookupTableEntriesPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Entries of the address lookup table at ${address} on Solana`,
        title: `Address Lookup Table Entries | ${address} | Solana`,
    };
}

export default function AddressLookupTableEntriesPage(props: Props) {
    return <AddressLookupTableEntriesPageClient {...props} />;
}
