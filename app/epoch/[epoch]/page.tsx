import { Metadata } from 'next/types';

import EpochDetailsPageClient from './page-client';

type Props = Readonly<{
    params: {
        epoch: string;
    };
}>;

export async function generateMetadata({ params: { epoch } }: Props): Promise<Metadata> {
    return {
        description: `Summary of ${epoch}`,
        title: `Epoch | ${epoch} | Zuma`,
    };
}

export default function EpochDetailsPage(props: Props) {
    return <EpochDetailsPageClient {...props} />;
}
