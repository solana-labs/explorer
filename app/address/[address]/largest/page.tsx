import { TokenLargestAccountsCard } from '@components/account/TokenLargestAccountsCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Largest holders of the token with address ${address} on Solana`,
        title: `Token Distribution | ${address} | Solana`,
    };
}

export default function TokenDistributionPage({ params: { address } }: Props) {
    return <TokenLargestAccountsCard mintAddress={address} />;
}
