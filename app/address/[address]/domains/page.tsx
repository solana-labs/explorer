import { DomainsCard } from '@components/account/DomainsCard';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Domain names owned by the address ${address} on Solana`,
        title: `Domains | ${address} | Solana`,
    };
}

export default function OwnedDomainsPage({ params: { address } }: Props) {
    return <DomainsCard address={address} />;
}
