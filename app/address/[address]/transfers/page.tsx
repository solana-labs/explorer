import { TokenTransfersCard } from '@components/account/history/TokenTransfersCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `History of all token transfers involving the address ${props.params.address} on Solana`,
        title: `Transfers | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function TokenTransfersPage({ params: { address } }: Props) {
    return <TokenTransfersCard address={address} />;
}
