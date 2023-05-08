/* eslint-disable @typescript-eslint/no-redeclare */

import { ParsedInfo } from '@validators/index';
import { PublicKeyFromString } from '@validators/pubkey';
import { any, coerce, create, Infer, literal, nullable, number, string, tuple, type, union } from 'superstruct';

export type ProgramAccountInfo = Infer<typeof ProgramAccountInfo>;
export const ProgramAccountInfo = type({
    programData: PublicKeyFromString,
});

export type ProgramAccount = Infer<typeof ProgramDataAccount>;
export const ProgramAccount = type({
    info: ProgramAccountInfo,
    type: literal('program'),
});

export type ProgramDataAccountInfo = Infer<typeof ProgramDataAccountInfo>;
export const ProgramDataAccountInfo = type({
    authority: nullable(PublicKeyFromString),
    data: tuple([string(), literal('base64')]),
    slot: number(),
});

export type ProgramDataAccount = Infer<typeof ProgramDataAccount>;
export const ProgramDataAccount = type({
    info: ProgramDataAccountInfo,
    type: literal('programData'),
});

export type ProgramBufferAccountInfo = Infer<typeof ProgramBufferAccountInfo>;
export const ProgramBufferAccountInfo = type({
    authority: nullable(PublicKeyFromString),
    // don't care about data yet
});

export type ProgramBufferAccount = Infer<typeof ProgramBufferAccount>;
export const ProgramBufferAccount = type({
    info: ProgramBufferAccountInfo,
    type: literal('buffer'),
});

export type ProgramUninitializedAccountInfo = Infer<typeof ProgramUninitializedAccountInfo>;
export const ProgramUninitializedAccountInfo = any();

export type ProgramUninitializedAccount = Infer<typeof ProgramUninitializedAccount>;
export const ProgramUninitializedAccount = type({
    info: ProgramUninitializedAccountInfo,
    type: literal('uninitialized'),
});

export type UpgradeableLoaderAccount = Infer<typeof UpgradeableLoaderAccount>;
export const UpgradeableLoaderAccount = coerce(
    union([ProgramAccount, ProgramDataAccount, ProgramBufferAccount, ProgramUninitializedAccount]),
    ParsedInfo,
    value => {
        // Coercions like `PublicKeyFromString` are not applied within
        // union validators so we use this custom coercion as a workaround.
        switch (value.type) {
            case 'program': {
                return {
                    info: create(value.info, ProgramAccountInfo),
                    type: value.type,
                };
            }
            case 'programData': {
                return {
                    info: create(value.info, ProgramDataAccountInfo),
                    type: value.type,
                };
            }
            case 'buffer': {
                return {
                    info: create(value.info, ProgramBufferAccountInfo),
                    type: value.type,
                };
            }
            case 'uninitialized': {
                return {
                    info: create(value.info, ProgramUninitializedAccountInfo),
                    type: value.type,
                };
            }
            default: {
                throw new Error(`Unknown program account type: ${value.type}`);
            }
        }
    }
);
