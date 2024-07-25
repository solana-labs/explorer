import { Metadata } from 'next/types';

import BlockRewardsTabClient from './page-client';

type Props = Readonly<{
    params: {
        slot: string;
    };
}>;

export async function generateMetadata({ params: { slot } }: Props): Promise<Metadata> {
    return {
        description: `List of addresses to which rewards were disbursed during block ${slot}`,
        title: `Block Rewards | ${slot} | Zuma`,
    };
}

export default function BlockRewardsTab(props: Props) {
    return <BlockRewardsTabClient {...props} />;
}
