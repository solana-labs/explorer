/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { enums, Infer, number, string, type } from 'superstruct';

export type WriteInfo = Infer<typeof WriteInfo>;
export const WriteInfo = type({
    account: PublicKeyFromString,
    bytes: string(),
    offset: number(),
});

export type FinalizeInfo = Infer<typeof FinalizeInfo>;
export const FinalizeInfo = type({
    account: PublicKeyFromString,
});

export type BpfLoaderInstructionType = Infer<typeof BpfLoaderInstructionType>;
export const BpfLoaderInstructionType = enums(['write', 'finalize']);
