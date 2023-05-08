import { TokenTransfersCard } from '@components/account/history/TokenTransfersCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `History of all token transfers involving the address ${address} on Solana`,
        title: `Transfers | ${address} | Solana`,
    };
}

export default function TokenTransfersPage({ params: { address } }: Props) {
    return <TokenTransfersCard address={address} />;
}
