/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { enums, Infer, type } from 'superstruct';

export type CreateIdempotentInfo = Infer<typeof CreateIdempotentInfo>;
export const CreateIdempotentInfo = type({
    account: PublicKeyFromString,
    mint: PublicKeyFromString,
    source: PublicKeyFromString,
    systemProgram: PublicKeyFromString,
    tokenProgram: PublicKeyFromString,
    wallet: PublicKeyFromString,
});

export type RecoverNestedInfo = Infer<typeof RecoverNestedInfo>;
export const RecoverNestedInfo = type({
    destination: PublicKeyFromString,
    nestedMint: PublicKeyFromString,
    nestedOwner: PublicKeyFromString,
    nestedSource: PublicKeyFromString,
    ownerMint: PublicKeyFromString,
    tokenProgram: PublicKeyFromString,
    wallet: PublicKeyFromString,
});

export type SystemInstructionType = Infer<typeof SystemInstructionType>;
export const SystemInstructionType = enums(['create', 'createIdempotent', 'recoverNested']);
