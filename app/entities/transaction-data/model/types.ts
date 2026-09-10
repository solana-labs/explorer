import type { TransactionVersion } from '@solana/kit';
import type {
    CompiledInnerInstruction,
    ParsedTransactionWithMeta,
    TransactionMessage,
    VersionedMessage,
} from '@solana/web3.js';

import type { V1TransactionConfig } from '@/app/shared/lib/v1-message-bridge';

/**
 * Message-level resource limits carried by a v1 transaction.
 *
 * v1 moves these out of Compute Budget instructions and into the message itself. `priorityFee`
 * is a total amount in lamports, unlike v0's per-compute-unit price in micro-lamports.
 */
export type TransactionConfig = V1TransactionConfig;

/**
 * A parsed transaction in the shape the transaction detail page consumes.
 *
 * Matches web3.js `ParsedTransactionWithMeta` so existing consumers are unaffected, with the
 * version widened to cover v1, which web3.js `TransactionVersion` cannot describe.
 */
export type TransactionWithMeta = Omit<ParsedTransactionWithMeta, 'version'> & {
    version?: TransactionVersion;
};

type RawTransactionBase = {
    /** Seconds since the epoch, as the cluster recorded the block. Absent until the block is confirmed. */
    blockTime?: number;
    messageBytes: Uint8Array;
    meta?: {
        innerInstructions?: CompiledInnerInstruction[];
        postBalances: number[];
        preBalances: number[];
    };
    /**
     * Wire size in bytes: signatures plus the compiled message, as the network holds it.
     *
     * Kit's `getTransactionSize` over the decoded transaction, so it needs no per-version knowledge
     * of the envelope — v1 drops the signature-count byte that earlier versions carry.
     */
    serializedSize: number;
    /** Base58-encoded in signer order; a signer slot that has not been signed is `undefined`. */
    signatures: (string | undefined)[];
};

/**
 * A transaction's wire bytes and the parts of its metadata the inspector needs.
 *
 * `message` and `transaction` are the web3.js views of the bytes, which web3.js can only build for
 * legacy and v0. `messageBytes` is always present, so anything that only needs the bytes — the
 * download button — works on every version. Only v1 carries a message-level `transactionConfig`,
 * and only when it sets at least one limit.
 */
export type RawTransaction = RawTransactionBase &
    (
        | {
              version: 'legacy' | 0;
              message: VersionedMessage;
              transaction: TransactionMessage;
              transactionConfig?: undefined;
          }
        | { version: 1; message?: undefined; transaction?: undefined; transactionConfig?: TransactionConfig }
    );
