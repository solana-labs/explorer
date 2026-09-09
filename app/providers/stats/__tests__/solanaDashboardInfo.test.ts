import { describe, expect, it } from 'vitest';

import { ClusterStatsStatus } from '../solanaClusterStats';
import {
    BlockTimeInfo,
    DashboardInfo,
    DashboardInfoAction,
    DashboardInfoActionType,
    dashboardInfoReducer,
    EpochInfo,
} from '../solanaDashboardInfo';
import { PerformanceSample } from '../solanaPerformanceInfo';

describe('dashboardInfoReducer', () => {
    const createInitialState = (overrides?: Partial<DashboardInfo>): DashboardInfo => ({
        epochInfo: {
            absoluteSlot: BigInt(0),
            blockHeight: BigInt(0),
            epoch: BigInt(0),
            slotIndex: BigInt(0),
            slotsInEpoch: BigInt(0),
        },
        msPerSlot_1h: 0,
        msPerSlot_1min: 0,
        status: ClusterStatsStatus.Loading,
        ...overrides,
    });

    describe('SetLastBlockTime', () => {
        it('should update lastBlockTime and set blockTime when state has no blockTime', () => {
            const initialState = createInitialState();
            const action: DashboardInfoAction = {
                data: {
                    blockTime: 1234567890,
                    slot: BigInt(1000),
                },
                type: DashboardInfoActionType.SetLastBlockTime,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.lastBlockTime).toEqual(action.data);
            expect(result.blockTime).toBe(1234567890);
            expect(result).toEqual({
                ...initialState,
                blockTime: 1234567890,
                lastBlockTime: action.data,
            });
        });

        it('should preserve existing blockTime when state already has blockTime', () => {
            const initialState = createInitialState({ blockTime: 999999999 });
            const action: DashboardInfoAction = {
                data: {
                    blockTime: 1234567890,
                    slot: BigInt(1000),
                },
                type: DashboardInfoActionType.SetLastBlockTime,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.lastBlockTime).toEqual(action.data);
            expect(result.blockTime).toBe(999999999); // Preserved from state
        });

        it('should update lastBlockTime even when it already exists', () => {
            const existingBlockTime: BlockTimeInfo = {
                blockTime: 1000000000,
                slot: BigInt(500),
            };
            const initialState = createInitialState({
                blockTime: 1000000000,
                lastBlockTime: existingBlockTime,
            });
            const action: DashboardInfoAction = {
                data: {
                    blockTime: 1234567890,
                    slot: BigInt(1000),
                },
                type: DashboardInfoActionType.SetLastBlockTime,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.lastBlockTime).toEqual(action.data);
            expect(result.lastBlockTime).not.toEqual(existingBlockTime);
        });
    });

    describe('SetPerfSamples', () => {
        it('should return state unchanged when data array is empty', () => {
            const initialState = createInitialState();
            const action: DashboardInfoAction = {
                data: [],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result).toBe(initialState);
        });

        it('should return state unchanged when all samples have zero numSlots', () => {
            const initialState = createInitialState();
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(0),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                    {
                        numSlots: BigInt(0),
                        numTransactions: BigInt(200),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result).toBe(initialState);
        });

        it('should calculate msPerSlot_1h and msPerSlot_1min correctly with single sample', () => {
            const initialState = createInitialState();
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(10),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.msPerSlot_1h).toBe(6000); // 60 s / 10 slots
            expect(result.msPerSlot_1min).toBe(6000); // 60 s / 10 slots
            expect(result.status).toBe(ClusterStatsStatus.Loading); // epochInfo.absoluteSlot is 0
        });

        it('should measure msPerSlot_1h over all samples when less than 60', () => {
            const initialState = createInitialState({
                epochInfo: {
                    absoluteSlot: BigInt(1000),
                    blockHeight: BigInt(500),
                    epoch: BigInt(5),
                    slotIndex: BigInt(100),
                    slotsInEpoch: BigInt(432000),
                },
            });
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(10),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                    {
                        numSlots: BigInt(20),
                        numTransactions: BigInt(200),
                        samplePeriodSecs: 60,
                    },
                    {
                        numSlots: BigInt(30),
                        numTransactions: BigInt(300),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            // 180 s over 60 slots. Not the mean of the three rates, (6000 + 3000 + 2000) / 3 = 3667 ms:
            // the slow minute produced 10 of the 60 slots, so it is a sixth of the answer, not a third.
            expect(result.msPerSlot_1h).toBe(3000);
            expect(result.msPerSlot_1min).toBe(6000); // Newest sample: 60 s / 10 slots
            expect(result.status).toBe(ClusterStatsStatus.Ready); // epochInfo.absoluteSlot is not 0
        });

        it('should limit samples to 60 when more than 60 samples provided', () => {
            const initialState = createInitialState();
            const withinTheHour: PerformanceSample[] = Array.from({ length: 60 }, () => ({
                numSlots: BigInt(10),
                numTransactions: BigInt(100),
                samplePeriodSecs: 60,
            }));
            const older: PerformanceSample[] = Array.from({ length: 40 }, () => ({
                numSlots: BigInt(1),
                numTransactions: BigInt(100),
                samplePeriodSecs: 60,
            }));

            const action: DashboardInfoAction = {
                data: [...withinTheHour, ...older],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            // The 40 older minutes would drag the rate up if the window did not stop at 60.
            expect(result.msPerSlot_1h).toBe(6000); // 60 s / 10 slots
            expect(result.msPerSlot_1min).toBe(6000); // Newest sample: 60 s / 10 slots
        });

        it('should skip a minute that produced no slot', () => {
            const initialState = createInitialState();
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(10),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                    {
                        numSlots: BigInt(0),
                        numTransactions: BigInt(200),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.msPerSlot_1h).toBe(6000); // 60 s / 10 slots
            expect(result.msPerSlot_1min).toBe(6000); // 60 s / 10 slots
        });

        // Reporting the minute before it as the "1min" figure would label a measurement as something it
        // is not, so the last poll's figures stand until the next one.
        it('should keep the previous figures when the newest minute produced no slot', () => {
            const initialState = createInitialState({ msPerSlot_1h: 400, msPerSlot_1min: 400 });
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(0),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                    {
                        numSlots: BigInt(10),
                        numTransactions: BigInt(200),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result).toBe(initialState);
        });

        it('should set status to Ready when epochInfo.absoluteSlot is not zero', () => {
            const initialState = createInitialState({
                epochInfo: {
                    absoluteSlot: BigInt(1000),
                    blockHeight: BigInt(500),
                    epoch: BigInt(5),
                    slotIndex: BigInt(100),
                    slotsInEpoch: BigInt(432000),
                },
            });
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(10),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.status).toBe(ClusterStatsStatus.Ready);
        });

        it('should set status to Loading when epochInfo.absoluteSlot is zero', () => {
            const initialState = createInitialState({
                epochInfo: {
                    absoluteSlot: BigInt(0),
                    blockHeight: BigInt(0),
                    epoch: BigInt(0),
                    slotIndex: BigInt(0),
                    slotsInEpoch: BigInt(0),
                },
            });
            const action: DashboardInfoAction = {
                data: [
                    {
                        numSlots: BigInt(10),
                        numTransactions: BigInt(100),
                        samplePeriodSecs: 60,
                    },
                ],
                type: DashboardInfoActionType.SetPerfSamples,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.status).toBe(ClusterStatsStatus.Loading);
        });
    });

    describe('SetEpochInfo', () => {
        it('should update epochInfo and set status to Ready when msPerSlot_1h is not zero', () => {
            const initialState = createInitialState({ msPerSlot_1h: 500 });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(1000),
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.epochInfo).toEqual(epochInfo);
            expect(result.status).toBe(ClusterStatsStatus.Ready);
        });

        it('should set status to Loading when msPerSlot_1h is zero', () => {
            const initialState = createInitialState({ msPerSlot_1h: 0 });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(1000),
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.epochInfo).toEqual(epochInfo);
            expect(result.status).toBe(ClusterStatsStatus.Loading);
        });

        it('should preserve existing blockTime when interpolation conditions are not met', () => {
            const initialState = createInitialState({
                blockTime: 1234567890,
                msPerSlot_1h: 500,
            });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(1000),
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.blockTime).toBe(1234567890);
        });

        it('should interpolate blockTime when all conditions are met', () => {
            const lastBlockTime: BlockTimeInfo = {
                blockTime: 1000000000,
                slot: BigInt(500),
            };
            const initialState = createInitialState({
                blockTime: 1000000000,
                lastBlockTime,
                msPerSlot_1h: 500, // 500ms per slot
            });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(1000), // 500 slots ahead
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            // blockTime = 1000000000 + (1000 - 500) * 500 = 1000000000 + 250000 = 1000250000
            const expectedBlockTime = 1000000000 + (1000 - 500) * 500;
            expect(result.blockTime).toBe(expectedBlockTime);
        });

        it('should not interpolate when absoluteSlot is less than lastBlockTime.slot', () => {
            const lastBlockTime: BlockTimeInfo = {
                blockTime: 1000000000,
                slot: BigInt(1000),
            };
            const initialState = createInitialState({
                blockTime: 1000000000,
                lastBlockTime,
                msPerSlot_1h: 500,
            });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(500), // Less than lastBlockTime.slot
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.blockTime).toBe(1000000000); // Preserved, no interpolation
        });

        it('should not interpolate when msPerSlot_1h is zero', () => {
            const lastBlockTime: BlockTimeInfo = {
                blockTime: 1000000000,
                slot: BigInt(500),
            };
            const initialState = createInitialState({
                blockTime: 1000000000,
                lastBlockTime,
                msPerSlot_1h: 0,
            });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(1000),
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.blockTime).toBe(1000000000); // Preserved, no interpolation
        });

        it('should not interpolate when lastBlockTime is not set', () => {
            const initialState = createInitialState({
                blockTime: 1000000000,
                lastBlockTime: undefined,
                msPerSlot_1h: 500,
            });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(1000),
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.blockTime).toBe(1000000000); // Preserved, no interpolation
        });

        it('should handle blockTime interpolation with exact slot match', () => {
            const lastBlockTime: BlockTimeInfo = {
                blockTime: 1000000000,
                slot: BigInt(500),
            };
            const initialState = createInitialState({
                blockTime: 1000000000,
                lastBlockTime,
                msPerSlot_1h: 500,
            });
            const epochInfo: EpochInfo = {
                absoluteSlot: BigInt(500), // Same as lastBlockTime.slot
                blockHeight: BigInt(500),
                epoch: BigInt(5),
                slotIndex: BigInt(100),
                slotsInEpoch: BigInt(432000),
            };
            const action: DashboardInfoAction = {
                data: epochInfo,
                type: DashboardInfoActionType.SetEpochInfo,
            };

            const result = dashboardInfoReducer(initialState, action);

            // blockTime = 1000000000 + (500 - 500) * 500 = 1000000000
            expect(result.blockTime).toBe(1000000000);
        });
    });

    describe('SetError', () => {
        it('should set status to Error', () => {
            const initialState = createInitialState({ status: ClusterStatsStatus.Ready });
            const action: DashboardInfoAction = {
                data: 'Some error message',
                type: DashboardInfoActionType.SetError,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.status).toBe(ClusterStatsStatus.Error);
            expect(result).toEqual({
                ...initialState,
                status: ClusterStatsStatus.Error,
            });
        });

        it('should preserve all other state properties', () => {
            const initialState = createInitialState({
                blockTime: 1234567890,
                msPerSlot_1h: 500,
                msPerSlot_1min: 600,
                status: ClusterStatsStatus.Loading,
            });
            const action: DashboardInfoAction = {
                data: 'Error occurred',
                type: DashboardInfoActionType.SetError,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result.status).toBe(ClusterStatsStatus.Error);
            expect(result.msPerSlot_1h).toBe(500);
            expect(result.msPerSlot_1min).toBe(600);
            expect(result.blockTime).toBe(1234567890);
        });
    });

    describe('Reset', () => {
        it('should replace entire state with action data', () => {
            const initialState = createInitialState({
                msPerSlot_1h: 500,
                msPerSlot_1min: 600,
                status: ClusterStatsStatus.Ready,
            });
            const newState: DashboardInfo = {
                blockTime: 9876543210,
                epochInfo: {
                    absoluteSlot: BigInt(2000),
                    blockHeight: BigInt(1000),
                    epoch: BigInt(10),
                    slotIndex: BigInt(200),
                    slotsInEpoch: BigInt(432000),
                },
                msPerSlot_1h: 700,
                msPerSlot_1min: 800,
                status: ClusterStatsStatus.Loading,
            };
            const action: DashboardInfoAction = {
                data: newState,
                type: DashboardInfoActionType.Reset,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result).toEqual(newState);
            expect(result).not.toEqual(initialState);
        });

        it('should completely replace state even with partial data', () => {
            const initialState = createInitialState({
                blockTime: 1234567890,
                lastBlockTime: {
                    blockTime: 1234567890,
                    slot: BigInt(1000),
                },
                msPerSlot_1h: 500,
                status: ClusterStatsStatus.Ready,
            });
            const newState: DashboardInfo = {
                epochInfo: {
                    absoluteSlot: BigInt(0),
                    blockHeight: BigInt(0),
                    epoch: BigInt(0),
                    slotIndex: BigInt(0),
                    slotsInEpoch: BigInt(0),
                },
                msPerSlot_1h: 0,
                msPerSlot_1min: 0,
                status: ClusterStatsStatus.Error,
            };
            const action: DashboardInfoAction = {
                data: newState,
                type: DashboardInfoActionType.Reset,
            };

            const result = dashboardInfoReducer(initialState, action);

            expect(result).toEqual(newState);
            expect(result.blockTime).toBeUndefined();
            expect(result.lastBlockTime).toBeUndefined();
        });
    });

    describe('default case', () => {
        it('should return state unchanged for unknown action type', () => {
            const initialState = createInitialState();
            const action = {
                data: {},
                type: 'UnknownAction' as unknown as DashboardInfoActionType,
            } as unknown as DashboardInfoAction;

            const result = dashboardInfoReducer(initialState, action);

            expect(result).toBe(initialState);
        });
    });
});
