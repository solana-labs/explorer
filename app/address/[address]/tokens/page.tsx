import { OwnedTokensCard } from '@components/account/OwnedTokensCard';
import { TokenHistoryCard } from '@components/account/TokenHistoryCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import { TransactionsProvider } from '@/app/providers/transactions';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `All tokens owned by the address ${props.params.address} on Solana`,
        title: `Tokens | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function OwnedTokensPage({ params: { address } }: Props) {
    return (
        <TransactionsProvider>
            <OwnedTokensCard address={address} />
            <TokenHistoryCard address={address} />
        </TransactionsProvider>
    );
}
