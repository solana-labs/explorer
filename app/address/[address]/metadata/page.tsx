import { Metadata } from 'next/types';

import MetaplexNFTMetadataPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Metadata for the Metaplex NFT with address ${address} on Solana`,
        title: `Metaplex NFT Metadata | ${address} | Solana`,
    };
}

export default function MetaplexNFTMetadataPage(props: Props) {
    return <MetaplexNFTMetadataPageClient {...props} />;
}
