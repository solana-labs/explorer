import { TokenInstructionsCard } from '@components/account/history/TokenInstructionsCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `A list of transactions that include an instruction involving the token with address ${address} on Solana`,
        title: `Token Instructions | ${address} | Solana`,
    };
}

export default function TokenInstructionsPage({ params: { address } }: Props) {
    return <TokenInstructionsCard address={address} />;
}
