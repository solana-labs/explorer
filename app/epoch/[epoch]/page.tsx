import { Metadata } from 'next/types';

import EpochDetailsPageClient from './page-client';

type Props = Readonly<{
    params: {
        epoch: string;
    };
}>;

export async function generateMetadata({ params: { epoch } }: Props): Promise<Metadata> {
    return {
        description: `Summary of ${epoch} on Solana`,
        title: `Epoch | ${epoch} | Solana`,
    };
}

export default function EpochDetailsPage(props: Props) {
    return <EpochDetailsPageClient {...props} />;
}
