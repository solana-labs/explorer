/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { enums, Infer, number, string, type } from 'superstruct';

export type CreateAccountInfo = Infer<typeof CreateAccountInfo>;
export const CreateAccountInfo = type({
    lamports: number(),
    newAccount: PublicKeyFromString,
    owner: PublicKeyFromString,
    source: PublicKeyFromString,
    space: number(),
});

export type AssignInfo = Infer<typeof AssignInfo>;
export const AssignInfo = type({
    account: PublicKeyFromString,
    owner: PublicKeyFromString,
});

export type TransferInfo = Infer<typeof TransferInfo>;
export const TransferInfo = type({
    destination: PublicKeyFromString,
    lamports: number(),
    source: PublicKeyFromString,
});

export type CreateAccountWithSeedInfo = Infer<typeof CreateAccountWithSeedInfo>;
export const CreateAccountWithSeedInfo = type({
    base: PublicKeyFromString,
    lamports: number(),
    newAccount: PublicKeyFromString,
    owner: PublicKeyFromString,
    seed: string(),
    source: PublicKeyFromString,
    space: number(),
});

export type AdvanceNonceInfo = Infer<typeof AdvanceNonceInfo>;
export const AdvanceNonceInfo = type({
    nonceAccount: PublicKeyFromString,
    nonceAuthority: PublicKeyFromString,
});

export type WithdrawNonceInfo = Infer<typeof WithdrawNonceInfo>;
export const WithdrawNonceInfo = type({
    destination: PublicKeyFromString,
    lamports: number(),
    nonceAccount: PublicKeyFromString,
    nonceAuthority: PublicKeyFromString,
});

export type InitializeNonceInfo = Infer<typeof InitializeNonceInfo>;
export const InitializeNonceInfo = type({
    nonceAccount: PublicKeyFromString,
    nonceAuthority: PublicKeyFromString,
});

export type AuthorizeNonceInfo = Infer<typeof AuthorizeNonceInfo>;
export const AuthorizeNonceInfo = type({
    newAuthorized: PublicKeyFromString,
    nonceAccount: PublicKeyFromString,
    nonceAuthority: PublicKeyFromString,
});

export type AllocateInfo = Infer<typeof AllocateInfo>;
export const AllocateInfo = type({
    account: PublicKeyFromString,
    space: number(),
});

export type AllocateWithSeedInfo = Infer<typeof AllocateWithSeedInfo>;
export const AllocateWithSeedInfo = type({
    account: PublicKeyFromString,
    base: PublicKeyFromString,
    owner: PublicKeyFromString,
    seed: string(),
    space: number(),
});

export type AssignWithSeedInfo = Infer<typeof AssignWithSeedInfo>;
export const AssignWithSeedInfo = type({
    account: PublicKeyFromString,
    base: PublicKeyFromString,
    owner: PublicKeyFromString,
    seed: string(),
});

export type TransferWithSeedInfo = Infer<typeof TransferWithSeedInfo>;
export const TransferWithSeedInfo = type({
    destination: PublicKeyFromString,
    lamports: number(),
    source: PublicKeyFromString,
    sourceBase: PublicKeyFromString,
    sourceOwner: PublicKeyFromString,
    sourceSeed: string(),
});

export type UpgradeNonceInfo = Infer<typeof UpgradeNonceInfo>;
export const UpgradeNonceInfo = type({
    nonceAccount: PublicKeyFromString,
});

export type SystemInstructionType = Infer<typeof SystemInstructionType>;
export const SystemInstructionType = enums([
    'createAccount',
    'createAccountWithSeed',
    'allocate',
    'allocateWithSeed',
    'assign',
    'assignWithSeed',
    'transfer',
    'advanceNonce',
    'withdrawNonce',
    'authorizeNonce',
    'initializeNonce',
    'transferWithSeed',
    'upgradeNonce',
]);
