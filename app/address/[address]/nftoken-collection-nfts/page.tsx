import { NFTokenCollectionNFTGrid } from '@components/account/nftoken/NFTokenCollectionNFTGrid';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `NFToken NFTs belonging to the collection ${address} on Solana`,
        title: `NFToken Collection NFTs | ${address} | Solana`,
    };
}

export default function NFTokenCollectionPage({ params: { address } }: Props) {
    return <NFTokenCollectionNFTGrid collection={address} />;
}
