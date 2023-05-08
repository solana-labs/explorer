/* eslint-disable @typescript-eslint/no-redeclare */

import { array, boolean, enums, Infer, literal, number, string, type, union } from 'superstruct';

export type SysvarAccountType = Infer<typeof SysvarAccountType>;
export const SysvarAccountType = enums([
    'clock',
    'epochSchedule',
    'fees',
    'recentBlockhashes',
    'rent',
    'rewards',
    'slotHashes',
    'slotHistory',
    'stakeHistory',
]);

export type ClockAccountInfo = Infer<typeof ClockAccountInfo>;
export const ClockAccountInfo = type({
    epoch: number(),
    leaderScheduleEpoch: number(),
    slot: number(),
    unixTimestamp: number(),
});

export type SysvarClockAccount = Infer<typeof SysvarClockAccount>;
export const SysvarClockAccount = type({
    info: ClockAccountInfo,
    type: literal('clock'),
});

export type EpochScheduleInfo = Infer<typeof EpochScheduleInfo>;
export const EpochScheduleInfo = type({
    firstNormalEpoch: number(),
    firstNormalSlot: number(),
    leaderScheduleSlotOffset: number(),
    slotsPerEpoch: number(),
    warmup: boolean(),
});

export type SysvarEpochScheduleAccount = Infer<typeof SysvarEpochScheduleAccount>;
export const SysvarEpochScheduleAccount = type({
    info: EpochScheduleInfo,
    type: literal('epochSchedule'),
});

export type FeesInfo = Infer<typeof FeesInfo>;
export const FeesInfo = type({
    feeCalculator: type({
        lamportsPerSignature: string(),
    }),
});

export type SysvarFeesAccount = Infer<typeof SysvarFeesAccount>;
export const SysvarFeesAccount = type({
    info: FeesInfo,
    type: literal('fees'),
});

export type RecentBlockhashesEntry = Infer<typeof RecentBlockhashesEntry>;
export const RecentBlockhashesEntry = type({
    blockhash: string(),
    feeCalculator: type({
        lamportsPerSignature: string(),
    }),
});

export type RecentBlockhashesInfo = Infer<typeof RecentBlockhashesInfo>;
export const RecentBlockhashesInfo = array(RecentBlockhashesEntry);

export type SysvarRecentBlockhashesAccount = Infer<typeof SysvarRecentBlockhashesAccount>;
export const SysvarRecentBlockhashesAccount = type({
    info: RecentBlockhashesInfo,
    type: literal('recentBlockhashes'),
});

export type RentInfo = Infer<typeof RentInfo>;
export const RentInfo = type({
    burnPercent: number(),
    exemptionThreshold: number(),
    lamportsPerByteYear: string(),
});

export type SysvarRentAccount = Infer<typeof SysvarRentAccount>;
export const SysvarRentAccount = type({
    info: RentInfo,
    type: literal('rent'),
});

export type RewardsInfo = Infer<typeof RewardsInfo>;
export const RewardsInfo = type({
    validatorPointValue: number(),
});

export type SysvarRewardsAccount = Infer<typeof SysvarRewardsAccount>;
export const SysvarRewardsAccount = type({
    info: RewardsInfo,
    type: literal('rewards'),
});

export type SlotHashEntry = Infer<typeof SlotHashEntry>;
export const SlotHashEntry = type({
    hash: string(),
    slot: number(),
});

export type SlotHashesInfo = Infer<typeof SlotHashesInfo>;
export const SlotHashesInfo = array(SlotHashEntry);

export type SysvarSlotHashesAccount = Infer<typeof SysvarSlotHashesAccount>;
export const SysvarSlotHashesAccount = type({
    info: SlotHashesInfo,
    type: literal('slotHashes'),
});

export type SlotHistoryInfo = Infer<typeof SlotHistoryInfo>;
export const SlotHistoryInfo = type({
    bits: string(),
    nextSlot: number(),
});

export type SysvarSlotHistoryAccount = Infer<typeof SysvarSlotHistoryAccount>;
export const SysvarSlotHistoryAccount = type({
    info: SlotHistoryInfo,
    type: literal('slotHistory'),
});

export type StakeHistoryEntryItem = Infer<typeof StakeHistoryEntryItem>;
export const StakeHistoryEntryItem = type({
    activating: number(),
    deactivating: number(),
    effective: number(),
});

export type StakeHistoryEntry = Infer<typeof StakeHistoryEntry>;
export const StakeHistoryEntry = type({
    epoch: number(),
    stakeHistory: StakeHistoryEntryItem,
});

export type StakeHistoryInfo = Infer<typeof StakeHistoryInfo>;
export const StakeHistoryInfo = array(StakeHistoryEntry);

export type SysvarStakeHistoryAccount = Infer<typeof SysvarStakeHistoryAccount>;
export const SysvarStakeHistoryAccount = type({
    info: StakeHistoryInfo,
    type: literal('stakeHistory'),
});

export type SysvarAccount = Infer<typeof SysvarAccount>;
export const SysvarAccount = union([
    SysvarClockAccount,
    SysvarEpochScheduleAccount,
    SysvarFeesAccount,
    SysvarRecentBlockhashesAccount,
    SysvarRentAccount,
    SysvarRewardsAccount,
    SysvarSlotHashesAccount,
    SysvarSlotHistoryAccount,
    SysvarStakeHistoryAccount,
]);
