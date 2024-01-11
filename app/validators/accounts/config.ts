/* eslint-disable @typescript-eslint/no-redeclare */

import { array, boolean, Infer, literal, number, record, string, type, union } from 'superstruct';

export type StakeConfigInfo = Infer<typeof StakeConfigInfo>;
export const StakeConfigInfo = type({
    slashPenalty: number(),
    warmupCooldownRate: number(),
});

export type ConfigKey = Infer<typeof ConfigKey>;
export const ConfigKey = type({
    pubkey: string(),
    signer: boolean(),
});

export type ValidatorInfoConfigData = Infer<typeof ValidatorInfoConfigData>;
export const ValidatorInfoConfigData = record(string(), string());

export type ValidatorInfoConfigInfo = Infer<typeof ValidatorInfoConfigInfo>;
export const ValidatorInfoConfigInfo = type({
    configData: ValidatorInfoConfigData,
    keys: array(ConfigKey),
});

export type ValidatorInfoAccount = Infer<typeof ValidatorInfoAccount>;
export const ValidatorInfoAccount = type({
    info: ValidatorInfoConfigInfo,
    type: literal('validatorInfo'),
});

export type StakeConfigInfoAccount = Infer<typeof StakeConfigInfoAccount>;
export const StakeConfigInfoAccount = type({
    info: StakeConfigInfo,
    type: literal('stakeConfig'),
});

export type ConfigAccount = Infer<typeof ConfigAccount>;
export const ConfigAccount = union([StakeConfigInfoAccount, ValidatorInfoAccount]);
