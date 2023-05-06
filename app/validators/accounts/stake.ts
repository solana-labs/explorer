/* eslint-disable @typescript-eslint/no-redeclare */

import { BigIntFromString } from '@validators/number';
import { PublicKeyFromString } from '@validators/pubkey';
import { enums, Infer, nullable, number, type } from 'superstruct';

export type StakeAccountType = Infer<typeof StakeAccountType>;
export const StakeAccountType = enums(['uninitialized', 'initialized', 'delegated', 'rewardsPool']);

export type StakeMeta = Infer<typeof StakeMeta>;
export const StakeMeta = type({
    authorized: type({
        staker: PublicKeyFromString,
        withdrawer: PublicKeyFromString,
    }),
    lockup: type({
        custodian: PublicKeyFromString,
        epoch: number(),
        unixTimestamp: number(),
    }),
    rentExemptReserve: BigIntFromString,
});

export type StakeAccountInfo = Infer<typeof StakeAccountInfo>;
export const StakeAccountInfo = type({
    meta: StakeMeta,
    stake: nullable(
        type({
            creditsObserved: number(),
            delegation: type({
                activationEpoch: BigIntFromString,
                deactivationEpoch: BigIntFromString,
                stake: BigIntFromString,
                voter: PublicKeyFromString,
                warmupCooldownRate: number(),
            }),
        })
    ),
});

export type StakeAccount = Infer<typeof StakeAccount>;
export const StakeAccount = type({
    info: StakeAccountInfo,
    type: StakeAccountType,
});
