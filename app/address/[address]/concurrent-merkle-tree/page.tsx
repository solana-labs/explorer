import { Metadata } from 'next/types';

import ConcurrentMerkleTreePageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Contents of the SPL Concurrent Merkle Tree at address ${address} on Solana`,
        title: `Concurrent Merkle Tree | ${address} | Solana`,
    };
}

export default function ConcurrentMerkleTreePage(props: Props) {
    console.log(props);
    return <ConcurrentMerkleTreePageClient {...props} />;
}
