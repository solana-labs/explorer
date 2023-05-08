/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { enums, Infer, number, string, type } from 'superstruct';

export type InitializeInfo = Infer<typeof InitializeInfo>;
export const InitializeInfo = type({
    authorized: type({
        staker: PublicKeyFromString,
        withdrawer: PublicKeyFromString,
    }),
    lockup: type({
        custodian: PublicKeyFromString,
        epoch: number(),
        unixTimestamp: number(),
    }),
    stakeAccount: PublicKeyFromString,
});

export type DelegateInfo = Infer<typeof DelegateInfo>;
export const DelegateInfo = type({
    stakeAccount: PublicKeyFromString,
    stakeAuthority: PublicKeyFromString,
    voteAccount: PublicKeyFromString,
});

export type AuthorizeInfo = Infer<typeof AuthorizeInfo>;
export const AuthorizeInfo = type({
    authority: PublicKeyFromString,
    authorityType: string(),
    newAuthority: PublicKeyFromString,
    stakeAccount: PublicKeyFromString,
});

export type SplitInfo = Infer<typeof SplitInfo>;
export const SplitInfo = type({
    lamports: number(),
    newSplitAccount: PublicKeyFromString,
    stakeAccount: PublicKeyFromString,
    stakeAuthority: PublicKeyFromString,
});

export type WithdrawInfo = Infer<typeof WithdrawInfo>;
export const WithdrawInfo = type({
    destination: PublicKeyFromString,
    lamports: number(),
    stakeAccount: PublicKeyFromString,
    withdrawAuthority: PublicKeyFromString,
});

export type DeactivateInfo = Infer<typeof DeactivateInfo>;
export const DeactivateInfo = type({
    stakeAccount: PublicKeyFromString,
    stakeAuthority: PublicKeyFromString,
});

export type MergeInfo = Infer<typeof MergeInfo>;
export const MergeInfo = type({
    clockSysvar: PublicKeyFromString,
    destination: PublicKeyFromString,
    source: PublicKeyFromString,
    stakeAuthority: PublicKeyFromString,
    stakeHistorySysvar: PublicKeyFromString,
});

export type StakeInstructionType = Infer<typeof StakeInstructionType>;
export const StakeInstructionType = enums([
    'initialize',
    'delegate',
    'authorize',
    'split',
    'withdraw',
    'deactivate',
    'merge',
]);
