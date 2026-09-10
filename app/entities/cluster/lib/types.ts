import { EpochSchedule } from '@utils/epoch-schedule';

export interface EpochInfo {
    absoluteSlot: bigint;
    blockHeight: bigint;
    epoch: bigint;
    slotIndex: bigint;
    slotsInEpoch: bigint;
}

// The two epoch values together, for pages that render both. Each half is fetched by its own hook,
// so a page that needs only the schedule never asks for the live epoch.
export interface ClusterInfo {
    epochSchedule: EpochSchedule;
    epochInfo: EpochInfo;
}
