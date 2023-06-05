import { ClusterStatsStatus } from './solanaClusterStats';
import { PerformanceSample } from './solanaPerformanceInfo';

export type DashboardInfo = {
    status: ClusterStatsStatus;
    avgSlotTime_1h: number;
    avgSlotTime_1min: number;
    epochInfo: EpochInfo;
    blockTime?: number;
    lastBlockTime?: BlockTimeInfo;
};

export type BlockTimeInfo = {
    blockTime: number;
    slot: bigint;
};

export enum DashboardInfoActionType {
    SetPerfSamples,
    SetEpochInfo,
    SetLastBlockTime,
    SetError,
    Reset,
}

export type EpochInfo = {
    absoluteSlot: bigint,
    blockHeight: bigint,
    epoch: bigint,
    slotIndex: bigint,
    slotsInEpoch: bigint,
};

export type DashboardInfoActionSetPerfSamples = {
    type: DashboardInfoActionType.SetPerfSamples;
    data: PerformanceSample[];
};

export type DashboardInfoActionSetEpochInfo = {
    type: DashboardInfoActionType.SetEpochInfo;
    data: EpochInfo;
};

export type DashboardInfoActionReset = {
    type: DashboardInfoActionType.Reset;
    data: DashboardInfo;
};

export type DashboardInfoActionSetError = {
    type: DashboardInfoActionType.SetError;
    data: string;
};

export type DashboardInfoActionSetLastBlockTime = {
    type: DashboardInfoActionType.SetLastBlockTime;
    data: BlockTimeInfo;
};

export type DashboardInfoAction =
    | DashboardInfoActionSetPerfSamples
    | DashboardInfoActionSetEpochInfo
    | DashboardInfoActionReset
    | DashboardInfoActionSetError
    | DashboardInfoActionSetLastBlockTime;

export function dashboardInfoReducer(state: DashboardInfo, action: DashboardInfoAction) {
    switch (action.type) {
        case DashboardInfoActionType.SetLastBlockTime: {
            const blockTime = state.blockTime || action.data.blockTime;
            return {
                ...state,
                blockTime,
                lastBlockTime: action.data,
            };
        }

        case DashboardInfoActionType.SetPerfSamples: {
            if (action.data.length < 1) {
                return state;
            }

            const samples = action.data
                .filter(sample => {
                    return sample.numSlots !== BigInt(0);
                })
                .map(sample => {
                    return sample.samplePeriodSecs / Number(sample.numSlots);
                })
                .slice(0, 60);

            const samplesInHour = samples.length < 60 ? samples.length : 60;
            const avgSlotTime_1h =
                samples.reduce((sum: number, cur: number) => {
                    return sum + cur;
                }, 0) / samplesInHour;

            const status = state.epochInfo.absoluteSlot !== BigInt(0) ? ClusterStatsStatus.Ready : ClusterStatsStatus.Loading;

            return {
                ...state,
                avgSlotTime_1h,
                avgSlotTime_1min: samples[0],
                status,
            };
        }

        case DashboardInfoActionType.SetEpochInfo: {
            const status = state.avgSlotTime_1h !== 0 ? ClusterStatsStatus.Ready : ClusterStatsStatus.Loading;

            let blockTime = state.blockTime;

            // interpolate blocktime based on last known blocktime and average slot time
            if (
                state.lastBlockTime &&
                state.avgSlotTime_1h !== 0 &&
                action.data.absoluteSlot >= state.lastBlockTime.slot
            ) {
                blockTime =
                    Number(BigInt(state.lastBlockTime.blockTime) +
                        (action.data.absoluteSlot - state.lastBlockTime.slot) * BigInt(Math.floor(state.avgSlotTime_1h * 1000)));
            }

            return {
                ...state,
                blockTime,
                epochInfo: action.data,
                status,
            };
        }

        case DashboardInfoActionType.SetError:
            return {
                ...state,
                status: ClusterStatsStatus.Error,
            };

        case DashboardInfoActionType.Reset:
            return {
                ...action.data,
            };

        default:
            return state;
    }
}
