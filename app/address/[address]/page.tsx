import { TransactionHistoryCard } from '@components/account/history/TransactionHistoryCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `History of all transactions involving the address ${address} on Solana`,
        title: `Transaction History | ${address} | Solana`,
    };
}

export default function TransactionHistoryPage({ params: { address } }: Props) {
    return <TransactionHistoryCard address={address} />;
}
