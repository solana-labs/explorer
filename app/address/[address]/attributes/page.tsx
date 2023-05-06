import { Metadata } from 'next/types';

import NFTAttributesPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Attributes of the Metaplex NFT with address ${address} on Solana`,
        title: `Metaplex NFT Attributes | ${address} | Solana`,
    };
}

export default function MetaplexNFTAttributesPage(props: Props) {
    return <NFTAttributesPageClient {...props} />;
}
