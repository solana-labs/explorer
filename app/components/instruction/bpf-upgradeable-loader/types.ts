/* eslint-disable @typescript-eslint/no-redeclare */

import { PublicKeyFromString } from '@validators/pubkey';
import { enums, Infer, number, optional, string, type } from 'superstruct';

export type InitializeBufferInfo = Infer<typeof InitializeBufferInfo>;
export const InitializeBufferInfo = type({
    account: PublicKeyFromString,
    authority: PublicKeyFromString,
});

export type WriteInfo = Infer<typeof WriteInfo>;
export const WriteInfo = type({
    account: PublicKeyFromString,
    authority: PublicKeyFromString,
    bytes: string(),
    offset: number(),
});

export type DeployWithMaxDataLenInfo = Infer<typeof DeployWithMaxDataLenInfo>;
export const DeployWithMaxDataLenInfo = type({
    authority: PublicKeyFromString,
    bufferAccount: PublicKeyFromString,
    clockSysvar: PublicKeyFromString,
    maxDataLen: number(),
    payerAccount: PublicKeyFromString,
    programAccount: PublicKeyFromString,
    programDataAccount: PublicKeyFromString,
    rentSysvar: PublicKeyFromString,
    systemProgram: PublicKeyFromString,
});

export type UpgradeInfo = Infer<typeof UpgradeInfo>;
export const UpgradeInfo = type({
    authority: PublicKeyFromString,
    bufferAccount: PublicKeyFromString,
    clockSysvar: PublicKeyFromString,
    programAccount: PublicKeyFromString,
    programDataAccount: PublicKeyFromString,
    rentSysvar: PublicKeyFromString,
    spillAccount: PublicKeyFromString,
});

export type SetAuthorityInfo = Infer<typeof SetAuthorityInfo>;
export const SetAuthorityInfo = type({
    account: PublicKeyFromString,
    authority: PublicKeyFromString,
    newAuthority: optional(PublicKeyFromString),
});

export type CloseInfo = Infer<typeof CloseInfo>;
export const CloseInfo = type({
    account: PublicKeyFromString,
    authority: PublicKeyFromString,
    programAccount: optional(PublicKeyFromString),
    recipient: PublicKeyFromString,
});

export type ExtendProgramInfo = Infer<typeof ExtendProgramInfo>;
export const ExtendProgramInfo = type({
    additionalBytes: number(),
    payerAccount: optional(PublicKeyFromString),
    programAccount: PublicKeyFromString,
    programDataAccount: PublicKeyFromString,
    systemProgram: optional(PublicKeyFromString),
});

export type UpgradeableBpfLoaderInstructionType = Infer<typeof UpgradeableBpfLoaderInstructionType>;
export const UpgradeableBpfLoaderInstructionType = enums([
    'initializeBuffer',
    'write',
    'deployWithMaxDataLen',
    'upgrade',
    'setAuthority',
    'close',
    'extendProgram',
]);
