import { RewardsCard } from '@components/account/RewardsCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Rewards due to the address ${address} by epoch on Solana`,
        title: `Address Rewards | ${address} | Solana`,
    };
}

export default function BlockRewardsPage({ params: { address } }: Props) {
    return <RewardsCard address={address} />;
}
