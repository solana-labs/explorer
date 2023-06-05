import { DomainsCard } from '@components/account/DomainsCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Domain names owned by the address ${props.params.address} on Solana`,
        title: `Domains | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default function OwnedDomainsPage({ params: { address } }: Props) {
    return <DomainsCard address={address} />;
}
