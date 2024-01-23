/* eslint-disable @typescript-eslint/no-redeclare */

import { TokenExtension } from '@validators/accounts/token-extension';
import { PublicKeyFromString } from '@validators/pubkey';
import { any, array, boolean, enums, Infer, nullable, number, optional, string, type } from 'superstruct';

export type TokenAccountType = Infer<typeof TokenAccountType>;
export const TokenAccountType = enums(['mint', 'account', 'multisig']);

export type TokenAccountState = Infer<typeof AccountState>;
const AccountState = enums(['initialized', 'uninitialized', 'frozen']);

const TokenAmount = type({
    amount: string(),
    decimals: number(),
    uiAmountString: string(),
});

export type TokenAccountInfo = Infer<typeof TokenAccountInfo>;
export const TokenAccountInfo = type({
    closeAuthority: optional(PublicKeyFromString),
    delegate: optional(PublicKeyFromString),
    delegatedAmount: optional(TokenAmount),
    extensions: optional(array(TokenExtension)),
    isNative: boolean(),
    mint: PublicKeyFromString,
    owner: PublicKeyFromString,
    rentExemptReserve: optional(TokenAmount),
    state: AccountState,
    tokenAmount: TokenAmount,
});

export type MintAccountInfo = Infer<typeof MintAccountInfo>;
export const MintAccountInfo = type({
    decimals: number(),
    extensions: optional(array(TokenExtension)),
    freezeAuthority: nullable(PublicKeyFromString),
    isInitialized: boolean(),
    mintAuthority: nullable(PublicKeyFromString),
    supply: string(),
});

export type MultisigAccountInfo = Infer<typeof MultisigAccountInfo>;
export const MultisigAccountInfo = type({
    isInitialized: boolean(),
    numRequiredSigners: number(),
    numValidSigners: number(),
    signers: array(PublicKeyFromString),
});

export type TokenAccount = Infer<typeof TokenAccount>;
export const TokenAccount = type({
    info: any(),
    type: TokenAccountType,
});
