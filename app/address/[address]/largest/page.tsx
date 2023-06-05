import { TokenLargestAccountsCard } from '@components/account/TokenLargestAccountsCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Largest holders of the token with address ${props.params.address} on Solana`,
        title: `Token Distribution | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function TokenDistributionPage({ params: { address } }: Props) {
    return <TokenLargestAccountsCard mintAddress={address} />;
}
