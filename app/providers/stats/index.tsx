import { SolanaPingProvider } from '@providers/stats/SolanaPingProvider';
import React from 'react';

import { SolanaClusterStatsProvider } from './solanaClusterStats';
import { ValidatorsAppStatsProvider } from './ValidatorsAppStatsProvider';

type Props = { children: React.ReactNode };
export function StatsProvider({ children }: Props) {
    return (
        <SolanaClusterStatsProvider>
            <SolanaPingProvider>
                <ValidatorsAppStatsProvider>{children}</ValidatorsAppStatsProvider>
            </SolanaPingProvider>
        </SolanaClusterStatsProvider>
    );
}
