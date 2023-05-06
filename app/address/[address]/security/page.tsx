import { Metadata } from 'next/types';

import SecurityPageClient from './page-client';

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Contents of the security.txt for the program with address ${address} on Solana`,
        title: `Security | ${address} | Solana`,
    };
}

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export default function SecurityPage(props: Props) {
    return <SecurityPageClient {...props} />;
}
