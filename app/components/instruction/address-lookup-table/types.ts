import { TransactionInstruction } from '@solana/web3.js';
import { PublicKeyFromString } from '@validators/pubkey';
import { array, Infer, number, type } from 'superstruct';

const PROGRAM_ID = 'AddressLookupTab1e1111111111111111111111111';

export type CreateLookupTableInfo = Infer<typeof CreateLookupTableInfo>;
export const CreateLookupTableInfo = type({
    bumpSeed: number(),
    lookupTableAccount: PublicKeyFromString,
    lookupTableAuthority: PublicKeyFromString,
    payerAccount: PublicKeyFromString,
    recentSlot: number(),
    systemProgram: PublicKeyFromString,
});

export type ExtendLookupTableInfo = Infer<typeof ExtendLookupTableInfo>;
export const ExtendLookupTableInfo = type({
    lookupTableAccount: PublicKeyFromString,
    lookupTableAuthority: PublicKeyFromString,
    newAddresses: array(PublicKeyFromString),
    payerAccount: PublicKeyFromString,
    systemProgram: PublicKeyFromString,
});

export type FreezeLookupTableInfo = Infer<typeof FreezeLookupTableInfo>;
export const FreezeLookupTableInfo = type({
    lookupTableAccount: PublicKeyFromString,
    lookupTableAuthority: PublicKeyFromString,
});

export type DeactivateLookupTableInfo = Infer<typeof DeactivateLookupTableInfo>;
export const DeactivateLookupTableInfo = type({
    lookupTableAccount: PublicKeyFromString,
    lookupTableAuthority: PublicKeyFromString,
});

export type CloseLookupTableInfo = Infer<typeof CloseLookupTableInfo>;
export const CloseLookupTableInfo = type({
    lookupTableAccount: PublicKeyFromString,
    lookupTableAuthority: PublicKeyFromString,
    recipient: PublicKeyFromString,
});

const INSTRUCTION_LOOKUP: { [key: number]: string } = {
    0: 'Create Lookup Table',
    1: 'Freeze Lookup Table',
    2: 'Extend Lookup Table',
    3: 'Deactivate Lookup Table',
    4: 'Close Lookup Table',
};

export function isAddressLookupTableInstruction(instruction: TransactionInstruction): boolean {
    return PROGRAM_ID === instruction.programId.toBase58();
}

export function parseAddressLookupTableInstructionTitle(instruction: TransactionInstruction): string {
    const code = instruction.data[0];

    if (!(code in INSTRUCTION_LOOKUP)) {
        throw new Error(`Unrecognized Address Lookup Table instruction code: ${code}`);
    }

    return INSTRUCTION_LOOKUP[code];
}
