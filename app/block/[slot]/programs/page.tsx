import { Metadata } from 'next/types';

import BlockProgramsTabClient from './page-client';

type Props = Readonly<{
    params: {
        slot: string;
    };
}>;

export async function generateMetadata({ params: { slot } }: Props): Promise<Metadata> {
    return {
        description: `Statistics pertaining to programs which were active during block ${slot} on Solana`,
        title: `Programs Active In Block | ${slot} | Solana`,
    };
}

export default function BlockProgramsTab(props: Props) {
    return <BlockProgramsTabClient {...props} />;
}
