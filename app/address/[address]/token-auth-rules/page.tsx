import { Metadata } from 'next/types';

import TokenAuthRulesClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata({ params: { address } }: Props): Promise<Metadata> {
    return {
        description: `Contents of the Token Auth Ruleset at address ${address} on Solana`,
        title: `Token Auth Ruleset | ${address} | Solana`,
    };
}

export default function AnchorAccountPage(props: Props) {
    return <TokenAuthRulesClient {...props} />;
}
