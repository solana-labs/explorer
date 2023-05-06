import { Metadata } from 'next/types';

import AnchorAccountPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Contents of the Anchor Account at address ${address} on Solana`,
        title: `Anchor Account Data | ${address} | Solana`,
    };
}

export default function AnchorAccountPage(props: Props) {
    return <AnchorAccountPageClient {...props} />;
}
