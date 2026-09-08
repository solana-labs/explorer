import {
    createSolanaRpc,
    getBase58Decoder,
    getBase64Encoder,
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    MAX_SUPPORTED_TRANSACTION_VERSION,
    signature,
    type Slot,
    type Transaction,
    type TransactionForFullBase64,
} from '@solana/kit';
import { create } from 'superstruct';

import { Logger } from '@/app/shared/lib/logger';

import { BlockResponseSchema, BlockTransactionResponseSchema } from '../model/block-response-schema';
import type { BlockData, BlockTransaction, BlockTransactionEntry, BlockTransactionMeta } from '../model/types';

/** Fetches the fields used by the block pages and decodes each wire transaction with kit. */
/* eslint-disable unicorn/no-null -- null is part of the RPC contract. */
export async function fetchBlock(url: string, slot: number): Promise<BlockData | null> {
    const response = await createSolanaRpc(url)
        .getBlock(BigInt(slot) as Slot, {
            commitment: 'confirmed',
            encoding: 'base64',
            maxSupportedTransactionVersion: MAX_SUPPORTED_TRANSACTION_VERSION,
            rewards: true,
            transactionDetails: 'full',
        })
        .send();

    if (response === null) return null;

    const block = create(response, BlockResponseSchema);

    return {
        blockTime: response.blockTime,
        blockhash: response.blockhash,
        parentSlot: response.parentSlot,
        previousBlockhash: response.previousBlockhash,
        rewards: response.rewards,
        transactions: response.transactions.map((rpcTransaction, index) =>
            adaptTransactionEntry({
                index,
                rpcTransaction,
                slot,
                transactionToValidate: block.transactions[index],
            }),
        ),
    };
}

function adaptTransactionEntry({
    rpcTransaction,
    transactionToValidate,
    index,
    slot,
}: {
    rpcTransaction: TransactionForFullBase64<1>;
    transactionToValidate: unknown;
    index: number;
    slot: number;
}): BlockTransactionEntry {
    try {
        const validated = create(transactionToValidate, BlockTransactionResponseSchema);
        return adaptTransaction({ costUnits: validated.meta?.costUnits, index, rpcTransaction });
    } catch (error) {
        Logger.error(error, { index, sentry: true, slot });
        return { index, unavailable: true };
    }
}

function adaptTransaction({
    rpcTransaction,
    costUnits,
    index,
}: {
    rpcTransaction: TransactionForFullBase64<1>;
    costUnits: bigint | number | undefined;
    index: number;
}): BlockTransaction {
    const wireBytes = new Uint8Array(getBase64Encoder().encode(rpcTransaction.transaction[0]));
    const transaction = getTransactionDecoder().decode(wireBytes);

    return {
        index,
        message: getCompiledTransactionMessageDecoder().decode(transaction.messageBytes),
        meta: adaptMeta(rpcTransaction.meta, costUnits),
        signatures: toBase58Signatures(transaction.signatures),
    };
}

function adaptMeta(
    meta: TransactionForFullBase64<1>['meta'],
    costUnits: bigint | number | undefined,
): BlockTransactionMeta | null {
    if (meta === null) return null;

    return {
        computeUnitsConsumed: meta.computeUnitsConsumed,
        costUnits: costUnits === undefined ? undefined : BigInt(costUnits),
        err: meta.err,
        fee: meta.fee,
        innerInstructions: meta.innerInstructions ?? undefined,
        loadedAddresses: meta.loadedAddresses ?? undefined,
        logMessages: meta.logMessages,
    };
}

/* eslint-enable unicorn/no-null */

function toBase58Signatures(signatures: Transaction['signatures']) {
    const base58Decoder = getBase58Decoder();
    return Object.values(signatures)
        .filter(value => value !== null)
        .map(value => signature(base58Decoder.decode(value)));
}
