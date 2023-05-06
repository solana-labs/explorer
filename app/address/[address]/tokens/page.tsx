import { OwnedTokensCard } from '@components/account/OwnedTokensCard';
import { TokenHistoryCard } from '@components/account/TokenHistoryCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `All tokens owned by the address ${address} on Solana`,
        title: `Tokens | ${address} | Solana`,
    };
}

export default function OwnedTokensPage({ params: { address } }: Props) {
    return (
        <>
            <OwnedTokensCard address={address} />
            <TokenHistoryCard address={address} />
        </>
    );
}
