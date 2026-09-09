import {
    ClusterStatsStatus,
    DashboardContext,
    PerformanceContext,
    StatsProviderContext,
} from '@providers/stats/solanaClusterStats';
import type { DashboardInfo } from '@providers/stats/solanaDashboardInfo';
import type { PerformanceInfo } from '@providers/stats/solanaPerformanceInfo';
import type { ReactNode } from 'react';

const defaultDashboard: DashboardInfo = {
    msPerSlot_1h: 420,
    msPerSlot_1min: 400,
    epochInfo: {
        absoluteSlot: 312_456_789n,
        blockHeight: 295_456_321n,
        epoch: 520n,
        slotIndex: 156_789n,
        slotsInEpoch: 432_000n,
    },
    status: ClusterStatsStatus.Ready,
};

const defaultPerformance: PerformanceInfo = {
    avgTps: 2500,
    historyMaxTps: 4200,
    perfHistory: {
        long: [],
        medium: [],
        short: [],
    },
    status: ClusterStatsStatus.Ready,
    transactionCount: 318_456_789_012n,
};

type Props = {
    children: ReactNode;
    dashboard?: DashboardInfo;
    performance?: PerformanceInfo;
    active?: boolean;
};

/**
 * Mock SolanaClusterStatsProvider for Storybook. Provides ready-state dashboard and performance
 * info without firing RPC polling intervals.
 */
export function MockStatsProvider({
    children,
    dashboard = defaultDashboard,
    performance = defaultPerformance,
    active = true,
}: Props) {
    return (
        <StatsProviderContext.Provider value={{ active, setActive: () => {}, setTimedOut: () => {}, retry: () => {} }}>
            <DashboardContext.Provider value={{ info: dashboard }}>
                <PerformanceContext.Provider value={{ info: performance }}>{children}</PerformanceContext.Provider>
            </DashboardContext.Provider>
        </StatsProviderContext.Provider>
    );
}
