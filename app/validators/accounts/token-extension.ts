import { PublicKeyFromString } from '@validators/pubkey';
import { any, array, boolean, enums, Infer, nullable, number, string, type } from 'superstruct';

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
    transferFeeConfigAuthority: nullable(PublicKeyFromString),
    withdrawWithheldAuthority: nullable(PublicKeyFromString),
    withheldAmount: number(),
});

export const TransferFeeAmount = type({
    withheldAmount: number(),
});

export const MintCloseAuthority = type({
    closeAuthority: nullable(PublicKeyFromString),
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
    delegate: nullable(PublicKeyFromString),
});

export const InterestBearingConfig = type({
    currentRate: number(),
    initializationTimestamp: number(),
    lastUpdateTimestamp: number(),
    preUpdateAverageRate: number(),
    rateAuthority: nullable(PublicKeyFromString),
});

export const ConfidentialTransferMint = type({
    auditorElgamalPubkey: nullable(string()),
    authority: nullable(PublicKeyFromString),
    autoApproveNewAccounts: boolean(),
});

export const ConfidentialTransferFeeConfig = type({
    authority: nullable(PublicKeyFromString),
    harvestToMintEnabled: boolean(),
    withdrawWithheldAuthorityElgamalPubkey: nullable(string()),
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
    authority: nullable(PublicKeyFromString),
    metadataAddress: nullable(PublicKeyFromString),
});

export const TokenMetadata = type({
    additionalMetadata: array(array(string())),
    mint: PublicKeyFromString,
    name: string(),
    symbol: string(),
    updateAuthority: nullable(PublicKeyFromString),
    uri: string(),
});

export const TransferHook = type({
    authority: nullable(PublicKeyFromString),
    programId: nullable(PublicKeyFromString),
});

export const TransferHookAccount = type({
    transferring: boolean(),
});

export const GroupPointer = type({
    authority: nullable(PublicKeyFromString),
    groupAddress: nullable(PublicKeyFromString),
});

export const GroupMemberPointer = type({
    authority: nullable(PublicKeyFromString),
    memberAddress: nullable(PublicKeyFromString),
});

export const TokenGroup = type({
    maxSize: number(),
    mint: PublicKeyFromString,
    size: number(),
    updateAuthority: nullable(PublicKeyFromString),
});

export const TokenGroupMember = type({
    group: PublicKeyFromString,
    memberNumber: number(),
    mint: PublicKeyFromString,
});
