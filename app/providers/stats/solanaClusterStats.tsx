'use client';

import { useCluster } from '@providers/cluster';
import { Cluster } from '@utils/cluster';
import React from 'react';
import useTabVisibility from 'use-tab-visibility';
import { createDefaultRpcTransport, createSolanaRpc } from 'web3js-experimental';

import { DashboardInfo, DashboardInfoActionType, dashboardInfoReducer, EpochInfo } from './solanaDashboardInfo';
import { PerformanceInfo, PerformanceInfoActionType, performanceInfoReducer, PerformanceSample } from './solanaPerformanceInfo';

export const PERF_UPDATE_SEC = 5;
export const SAMPLE_HISTORY_HOURS = 6;
export const PERFORMANCE_SAMPLE_INTERVAL = 60000;
export const TRANSACTION_COUNT_INTERVAL = 5000;
export const EPOCH_INFO_INTERVAL = 2000;
export const BLOCK_TIME_INTERVAL = 5000;
export const LOADING_TIMEOUT = 10000;

export enum ClusterStatsStatus {
    Loading,
    Ready,
    Error,
}

const initialPerformanceInfo: PerformanceInfo = {
    avgTps: 0,
    historyMaxTps: 0,
    perfHistory: {
        long: [],
        medium: [],
        short: [],
    },
    status: ClusterStatsStatus.Loading,
    transactionCount: BigInt(0),
};

const initialDashboardInfo: DashboardInfo = {
    avgSlotTime_1h: 0,
    avgSlotTime_1min: 0,
    epochInfo: {
        absoluteSlot: BigInt(0),
        blockHeight: BigInt(0),
        epoch: BigInt(0),
        slotIndex: BigInt(0),
        slotsInEpoch: BigInt(0),
    },
    status: ClusterStatsStatus.Loading,
};

type SetActive = React.Dispatch<React.SetStateAction<boolean>>;
const StatsProviderContext = React.createContext<
    | {
        setActive: SetActive;
        setTimedOut: () => void;
        retry: () => void;
        active: boolean;
    }
    | undefined
>(undefined);

type DashboardState = { info: DashboardInfo };
const DashboardContext = React.createContext<DashboardState | undefined>(undefined);

type PerformanceState = { info: PerformanceInfo };
const PerformanceContext = React.createContext<PerformanceState | undefined>(undefined);

type Props = { children: React.ReactNode };

export function SolanaClusterStatsProvider({ children }: Props) {
    const { cluster, url } = useCluster();
    const [active, setActive] = React.useState(false);
    const [dashboardInfo, dispatchDashboardInfo] = React.useReducer(dashboardInfoReducer, initialDashboardInfo);
    const [performanceInfo, dispatchPerformanceInfo] = React.useReducer(performanceInfoReducer, initialPerformanceInfo);
    const { visible: isTabVisible } = useTabVisibility();
    React.useEffect(() => {
        if (!active || !isTabVisible || !url) return;

        const transport = createDefaultRpcTransport({ url });
        const rpc = createSolanaRpc({ transport });

        let lastSlot: bigint | null = null;
        let stale = false;
        const getPerformanceSamples = async () => {
            try {
                const samplesResponse = await rpc.getRecentPerformanceSamples(60 * SAMPLE_HISTORY_HOURS).send();

                const samples: PerformanceSample[] = samplesResponse.map(s => ({
                    numSlots: s.numSlots,
                    numTransactions: s.numTransactions,
                    samplePeriodSecs: s.samplePeriodSecs,
                }));

                if (stale) {
                    return;
                }
                if (samplesResponse.length < 1) {
                    // no samples to work with (node has no history).
                    return; // we will allow for a timeout instead of throwing an error
                }

                dispatchPerformanceInfo({
                    data: samples,
                    type: PerformanceInfoActionType.SetPerfSamples,
                });

                dispatchDashboardInfo({
                    data: samples,
                    type: DashboardInfoActionType.SetPerfSamples,
                });
            } catch (error) {
                if (cluster !== Cluster.Custom) {
                    console.error(error, { url });
                }
                if (error instanceof Error) {
                    dispatchPerformanceInfo({
                        data: error.toString(),
                        type: PerformanceInfoActionType.SetError,
                    });
                    dispatchDashboardInfo({
                        data: error.toString(),
                        type: DashboardInfoActionType.SetError,
                    });
                }
                setActive(false);
            }
        };

        const getTransactionCount = async () => {
            try {
                const transactionCount = await rpc.getTransactionCount({ commitment: 'confirmed' }).send();
                if (stale) {
                    return;
                }
                dispatchPerformanceInfo({
                    data: transactionCount,
                    type: PerformanceInfoActionType.SetTransactionCount,
                });
            } catch (error) {
                if (cluster !== Cluster.Custom) {
                    console.error(error, { url });
                }
                if (error instanceof Error) {
                    dispatchPerformanceInfo({
                        data: error.toString(),
                        type: PerformanceInfoActionType.SetError,
                    });
                }
                setActive(false);
            }
        };

        const getEpochInfo = async () => {
            try {
                const epochInfoResponse = await rpc.getEpochInfo().send();

                const epochInfo: EpochInfo = {
                    absoluteSlot: epochInfoResponse.absoluteSlot,
                    blockHeight: epochInfoResponse.blockHeight,
                    epoch: epochInfoResponse.epoch,
                    slotIndex: epochInfoResponse.slotIndex,
                    slotsInEpoch: epochInfoResponse.slotsInEpoch,
                }

                if (stale) {
                    return;
                }
                lastSlot = epochInfo.absoluteSlot;
                dispatchDashboardInfo({
                    data: epochInfo,
                    type: DashboardInfoActionType.SetEpochInfo,
                });
            } catch (error) {
                if (cluster !== Cluster.Custom) {
                    console.error(error, { url });
                }
                if (error instanceof Error) {
                    dispatchDashboardInfo({
                        data: error.toString(),
                        type: DashboardInfoActionType.SetError,
                    });
                }
                setActive(false);
            }
        };

        const getBlockTime = async () => {
            if (lastSlot) {
                try {
                    const blockTime = await rpc.getBlockTime(lastSlot).send();

                    if (stale) {
                        return;
                    }
                    dispatchDashboardInfo({
                        data: {
                            blockTime: blockTime * 1000,
                            slot: lastSlot,
                        },
                        type: DashboardInfoActionType.SetLastBlockTime,
                    });
                } catch (error) {
                    // let this fail gracefully
                }
            }
        };

        const performanceInterval = setInterval(getPerformanceSamples, PERFORMANCE_SAMPLE_INTERVAL);
        const transactionCountInterval = setInterval(getTransactionCount, TRANSACTION_COUNT_INTERVAL);
        const epochInfoInterval = setInterval(getEpochInfo, EPOCH_INFO_INTERVAL);
        const blockTimeInterval = setInterval(getBlockTime, BLOCK_TIME_INTERVAL);

        getPerformanceSamples();
        getTransactionCount();
        (async () => {
            await getEpochInfo();
            await getBlockTime();
        })();

        return () => {
            clearInterval(performanceInterval);
            clearInterval(transactionCountInterval);
            clearInterval(epochInfoInterval);
            clearInterval(blockTimeInterval);
            stale = true;
        };
    }, [active, cluster, isTabVisible, url]);

    // Reset when cluster changes
    React.useEffect(() => {
        return () => {
            resetData();
        };
    }, [url]);

    function resetData() {
        dispatchDashboardInfo({
            data: initialDashboardInfo,
            type: DashboardInfoActionType.Reset,
        });
        dispatchPerformanceInfo({
            data: initialPerformanceInfo,
            type: PerformanceInfoActionType.Reset,
        });
    }

    const setTimedOut = React.useCallback(() => {
        dispatchDashboardInfo({
            data: 'Cluster stats timed out',
            type: DashboardInfoActionType.SetError,
        });
        dispatchPerformanceInfo({
            data: 'Cluster stats timed out',
            type: PerformanceInfoActionType.SetError,
        });
        console.error('Cluster stats timed out');
        setActive(false);
    }, []);

    const retry = React.useCallback(() => {
        resetData();
        setActive(true);
    }, []);

    return (
        <StatsProviderContext.Provider value={{ active, retry, setActive, setTimedOut }}>
            <DashboardContext.Provider value={{ info: dashboardInfo }}>
                <PerformanceContext.Provider value={{ info: performanceInfo }}>{children}</PerformanceContext.Provider>
            </DashboardContext.Provider>
        </StatsProviderContext.Provider>
    );
}

export function useStatsProvider() {
    const context = React.useContext(StatsProviderContext);
    if (!context) {
        throw new Error(`useContext must be used within a StatsProvider`);
    }
    return context;
}

export function useDashboardInfo() {
    const context = React.useContext(DashboardContext);
    if (!context) {
        throw new Error(`useDashboardInfo must be used within a StatsProvider`);
    }
    return context.info;
}

export function usePerformanceInfo() {
    const context = React.useContext(PerformanceContext);
    if (!context) {
        throw new Error(`usePerformanceInfo must be used within a StatsProvider`);
    }
    return context.info;
}
