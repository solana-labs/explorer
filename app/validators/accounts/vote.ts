/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { array, enums, Infer, nullable, number, string, type } from 'superstruct';

export type VoteAccountType = Infer<typeof VoteAccountType>;
export const VoteAccountType = enums(['vote']);

export type AuthorizedVoter = Infer<typeof AuthorizedVoter>;
export const AuthorizedVoter = type({
    authorizedVoter: PublicKeyFromString,
    epoch: number(),
});

export type PriorVoter = Infer<typeof PriorVoter>;
export const PriorVoter = type({
    authorizedPubkey: PublicKeyFromString,
    epochOfLastAuthorizedSwitch: number(),
    targetEpoch: number(),
});

export type EpochCredits = Infer<typeof EpochCredits>;
export const EpochCredits = type({
    credits: string(),
    epoch: number(),
    previousCredits: string(),
});

export type Vote = Infer<typeof Vote>;
export const Vote = type({
    confirmationCount: number(),
    slot: number(),
});

export type VoteAccountInfo = Infer<typeof VoteAccountInfo>;
export const VoteAccountInfo = type({
    authorizedVoters: array(AuthorizedVoter),
    authorizedWithdrawer: PublicKeyFromString,
    commission: number(),
    epochCredits: array(EpochCredits),
    lastTimestamp: type({
        slot: number(),
        timestamp: number(),
    }),
    nodePubkey: PublicKeyFromString,
    priorVoters: array(PriorVoter),
    rootSlot: nullable(number()),
    votes: array(Vote),
});

export type VoteAccount = Infer<typeof VoteAccount>;
export const VoteAccount = type({
    info: VoteAccountInfo,
    type: VoteAccountType,
});
