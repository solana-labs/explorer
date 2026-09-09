import type {
    Blockhash,
    CompiledTransactionMessage,
    CompiledTransactionMessageWithLifetime,
    Reward,
    Signature,
    Slot,
    TransactionForFullBase64,
    UnixTimestamp,
} from '@solana/kit';

export type BlockTransactionMeta = Pick<
    NonNullable<TransactionForFullBase64<1>['meta']>,
    'computeUnitsConsumed' | 'err' | 'fee' | 'logMessages'
> &
    Partial<Pick<NonNullable<TransactionForFullBase64<1>['meta']>, 'innerInstructions' | 'loadedAddresses'>> &
    Readonly<{
        /** Served by RPC nodes, but not yet included in kit's transaction meta type. */
        costUnits?: bigint;
    }>;

export type BlockTransaction = Readonly<{
    index: number;
    message: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;
    meta: BlockTransactionMeta | null;
    signatures: readonly Signature[];
}>;

export type UnavailableBlockTransaction = Readonly<{
    index: number;
    unavailable: true;
}>;

export type BlockTransactionEntry = BlockTransaction | UnavailableBlockTransaction;

export type BlockData = Readonly<{
    blockTime: UnixTimestamp | null;
    blockhash: Blockhash;
    parentSlot: Slot;
    previousBlockhash: Blockhash;
    rewards: readonly Reward[];
    transactions: readonly BlockTransactionEntry[];
}>;

export function isBlockTransaction(entry: BlockTransactionEntry): entry is BlockTransaction {
    return !('unavailable' in entry);
}
