import { ClusterStatsStatus } from './solanaClusterStats';

export type PerformanceInfo = {
    status: ClusterStatsStatus;
    avgTps: number;
    historyMaxTps: number;
    perfHistory: {
        short: (number | null)[];
        medium: (number | null)[];
        long: (number | null)[];
    };
    transactionCount: bigint;
};

export type PerformanceSample = {
    numTransactions: bigint;
    numSlots: bigint;
    samplePeriodSecs: number;
};

export enum PerformanceInfoActionType {
    SetTransactionCount,
    SetPerfSamples,
    SetError,
    Reset,
}

export type PerformanceInfoActionSetTransactionCount = {
    type: PerformanceInfoActionType.SetTransactionCount;
    data: bigint;
};

export type PerformanceInfoActionSetPerfSamples = {
    type: PerformanceInfoActionType.SetPerfSamples;
    data: PerformanceSample[];
};

export type PerformanceInfoActionSetError = {
    type: PerformanceInfoActionType.SetError;
    data: string;
};

export type PerformanceInfoActionReset = {
    type: PerformanceInfoActionType.Reset;
    data: PerformanceInfo;
};

export type PerformanceInfoAction =
    | PerformanceInfoActionSetTransactionCount
    | PerformanceInfoActionSetPerfSamples
    | PerformanceInfoActionSetError
    | PerformanceInfoActionReset;

export function performanceInfoReducer(state: PerformanceInfo, action: PerformanceInfoAction) {
    switch (action.type) {
        case PerformanceInfoActionType.SetPerfSamples: {
            if (action.data.length < 1) {
                return state;
            }

            const short = action.data
                .filter(sample => {
                    return sample.numTransactions !== BigInt(0);
                })
                .map(sample => {
                    return Number(sample.numTransactions / BigInt(sample.samplePeriodSecs));
                });

            const avgTps = short[0];
            const medium = downsampleByFactor(short, 4);
            const long = downsampleByFactor(medium, 3);

            const perfHistory = {
                long: round(long.slice(0, 30)).reverse(),
                medium: round(medium.slice(0, 30)).reverse(),
                short: round(short.slice(0, 30)).reverse(),
            };

            const historyMaxTps = Math.max(
                Math.max(...perfHistory.short),
                Math.max(...perfHistory.medium),
                Math.max(...perfHistory.long)
            );

            const status = state.transactionCount !== BigInt(0) ? ClusterStatsStatus.Ready : ClusterStatsStatus.Loading;

            return {
                ...state,
                avgTps,
                historyMaxTps,
                perfHistory,
                status,
            };
        }

        case PerformanceInfoActionType.SetTransactionCount: {
            const status = state.avgTps !== 0 ? ClusterStatsStatus.Ready : ClusterStatsStatus.Loading;

            return {
                ...state,
                status,
                transactionCount: action.data,
            };
        }

        case PerformanceInfoActionType.SetError:
            return {
                ...state,
                status: ClusterStatsStatus.Error,
            };

        case PerformanceInfoActionType.Reset:
            return {
                ...action.data,
            };

        default:
            return state;
    }
}

function downsampleByFactor(series: number[], factor: number) {
    return series.reduce((result: number[], num: number, i: number) => {
        const downsampledIndex = Math.floor(i / factor);
        if (result.length < downsampledIndex + 1) {
            result.push(0);
        }
        const mean = result[downsampledIndex];
        const differential = (num - mean) / ((i % factor) + 1);
        result[downsampledIndex] = mean + differential;
        return result;
    }, []);
}

function round(series: number[]) {
    return series.map(n => Math.round(n));
}
