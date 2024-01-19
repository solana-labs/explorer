import { PublicKeyFromString } from '@validators/pubkey';
import { any, array, boolean, enums, Infer, number, optional, string, type } from 'superstruct';

export type TokenExtensionType = Infer<typeof ExtensionType>;
const ExtensionType = enums([
    'transferFeeConfig',
    'transferFeeAmount',
    'mintCloseAuthority',
    'confidentialTransferMint',
    'confidentialTransferAccount',
    'defaultAccountState',
    'immutableOwner',
    'memoTransfer',
    'nonTransferable',
    'interestBearingConfig',
    'cpiGuard',
    'permanentDelegate',
    'nonTransferableAccount',
    'confidentialTransferFeeConfig',
    'confidentialTransferFeeAmount',
    'transferHook',
    'transferHookAccount',
    'metadataPointer',
    'tokenMetadata',
    'groupPointer',
    'groupMemberPointer',
    'tokenGroup',
    'tokenGroupMember',
    'unparseableExtension',
]);

export type TokenExtension = Infer<typeof TokenExtension>;
export const TokenExtension = type({
    extension: ExtensionType,
    state: any(),
});

const TransferFee = type({
    epoch: number(),
    maximumFee: number(),
    transferFeeBasisPoints: number(),
});

export const TransferFeeConfig = type({
    newerTransferFee: TransferFee,
    olderTransferFee: TransferFee,
    transferFeeConfigAuthority: optional(PublicKeyFromString),
    withdrawWithheldAuthority: optional(PublicKeyFromString),
    withheldAmount: number(),
});

export const TransferFeeAmount = type({
    withheldAmount: number(),
});

export const MintCloseAuthority = type({
    closeAuthority: optional(PublicKeyFromString),
});

const AccountState = enums(['initialized', 'frozen']);
export const DefaultAccountState = type({
    accountState: AccountState,
});

export const MemoTransfer = type({
    requireIncomingTransferMemos: boolean(),
});

export const CpiGuard = type({
    lockCpi: boolean(),
});

export const PermanentDelegate = type({
    delegate: optional(PublicKeyFromString),
});

export const InterestBearingConfig = type({
    currentRate: number(),
    initializationTimestamp: number(),
    lastUpdateTimestamp: number(),
    preUpdateAverageRate: number(),
    rateAuthority: optional(PublicKeyFromString),
});

export const ConfidentialTransferMint = type({
    auditorElgamalPubkey: optional(PublicKeyFromString),
    authority: optional(PublicKeyFromString),
    autoApproveNewAccounts: boolean(),
});

export const ConfidentialTransferFeeConfig = type({
    authority: optional(PublicKeyFromString),
    harvestToMintEnabled: boolean(),
    withdrawWithheldAuthorityElgamalPubkey: optional(PublicKeyFromString),
    withheldAmount: string(),
});

export const ConfidentialTransferAccount = type({
    actualPendingBalanceCreditCounter: number(),
    allowConfidentialCredits: boolean(),
    allowNonConfidentialCredits: boolean(),
    approved: boolean(),
    availableBalance: string(),
    decryptableAvailableBalance: string(),
    elgamalPubkey: string(),
    expectedPendingBalanceCreditCounter: number(),
    maximumPendingBalanceCreditCounter: number(),
    pendingBalanceCreditCounter: number(),
    pendingBalanceHi: string(),
    pendingBalanceLo: string(),
});

export const ConfidentialTransferFeeAmount = type({
    withheldAmount: string(),
});

export const MetadataPointer = type({
    authority: optional(PublicKeyFromString),
    metadataAddress: optional(PublicKeyFromString),
});

export const TokenMetadata = type({
    additionalMetadata: array(array(string())),
    mint: PublicKeyFromString,
    name: string(),
    symbol: string(),
    updateAuthority: optional(PublicKeyFromString),
    uri: string(),
});

export const TransferHook = type({
    authority: optional(PublicKeyFromString),
    programId: optional(PublicKeyFromString),
});

export const TransferHookAccount = type({
    transferring: boolean(),
});

export const GroupPointer = type({
    authority: optional(PublicKeyFromString),
    groupAddress: optional(PublicKeyFromString),
});

export const GroupMemberPointer = type({
    authority: optional(PublicKeyFromString),
    memberAddress: optional(PublicKeyFromString),
});

export const TokenGroup = type({
    maxSize: number(),
    mint: PublicKeyFromString,
    size: number(),
    updateAuthority: optional(PublicKeyFromString),
});

export const TokenGroupMember = type({
    group: PublicKeyFromString,
    memberNumber: number(),
    mint: PublicKeyFromString,
});
