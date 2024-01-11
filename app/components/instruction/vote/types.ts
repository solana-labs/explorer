/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { array, Infer, nullable, number, optional, string, type } from 'superstruct';

export type InitializeInfo = Infer<typeof InitializeInfo>;
export const InitializeInfo = type({
    authorizedVoter: PublicKeyFromString,
    authorizedWithdrawer: PublicKeyFromString,
    clockSysvar: PublicKeyFromString,
    commission: number(),
    node: PublicKeyFromString,
    rentSysvar: PublicKeyFromString,
    voteAccount: PublicKeyFromString,
});

export type AuthorizeInfo = Infer<typeof AuthorizeInfo>;
export const AuthorizeInfo = type({
    authority: PublicKeyFromString,
    authorityType: number(),
    clockSysvar: PublicKeyFromString,
    newAuthority: PublicKeyFromString,
    voteAccount: PublicKeyFromString,
});

export type VoteInfo = Infer<typeof VoteInfo>;
export const VoteInfo = type({
    clockSysvar: PublicKeyFromString,
    slotHashesSysvar: PublicKeyFromString,
    vote: type({
        hash: string(),
        slots: array(number()),
        timestamp: optional(nullable(number())),
    }),
    voteAccount: PublicKeyFromString,
    voteAuthority: PublicKeyFromString,
});

export type WithdrawInfo = Infer<typeof WithdrawInfo>;
export const WithdrawInfo = type({
    destination: PublicKeyFromString,
    lamports: number(),
    voteAccount: PublicKeyFromString,
    withdrawAuthority: PublicKeyFromString,
});

export type UpdateValidatorInfo = Infer<typeof UpdateValidatorInfo>;
export const UpdateValidatorInfo = type({
    newValidatorIdentity: PublicKeyFromString,
    voteAccount: PublicKeyFromString,
    withdrawAuthority: PublicKeyFromString,
});

export type UpdateCommissionInfo = Infer<typeof UpdateCommissionInfo>;
export const UpdateCommissionInfo = type({
    commission: number(),
    voteAccount: PublicKeyFromString,
    withdrawAuthority: PublicKeyFromString,
});

export type VoteSwitchInfo = Infer<typeof VoteSwitchInfo>;
export const VoteSwitchInfo = type({
    clockSysvar: PublicKeyFromString,
    hash: string(),
    slotHashesSysvar: PublicKeyFromString,
    vote: type({
        hash: string(),
        slots: array(number()),
        timestamp: number(),
    }),
    voteAccount: PublicKeyFromString,
    voteAuthority: PublicKeyFromString,
});
