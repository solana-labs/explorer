import { DEFAULT_SIGNATURE } from '@__fixtures__/gen';
import type { RawTransaction } from '@entities/transaction-data';
import { createWeb3TransactionBytes } from '@entities/transaction-data/__fixtures__/wire-transactions';
import { getBase58Decoder } from '@solana/kit';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import { ComputeBudgetProgram, PublicKey, SystemProgram, TransactionMessage, VersionedMessage } from '@solana/web3.js';
import {
    mockParsedTransactionDetails,
    mockRawTransactionDetails,
    mockTransactionStatus,
} from '@storybook-config/__fixtures__/transactions';

import { alloc, writeUint32LE } from '@/app/shared/lib/bytes';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

export { DEFAULT_SIGNATURE };

const BASE58_DECODER = getBase58Decoder();

export const FEE_PAYER = new PublicKey('9noXzpXnkyEcKF3AeXqUHTdR59V5uvrRBUZ9bwfQwxNq');
export const RECIPIENT = new PublicKey('GsbwXfJraMomNxBcpR3DBr9yoWR2PmN93PEaYJz7MSTN');
export const TOKEN_ACCOUNT = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export const MOCK_STATUS = mockTransactionStatus();
export const MOCK_FAILED_STATUS = mockTransactionStatus({ err: { InstructionError: [0, 'GenericError'] } });

const BASE_TX = {
    blockTime: 1_716_000_000,
    meta: {
        // A System transfer consumes 150 units, and `costUnits` is the *executed* cost, so it has to
        // contain them. The pair is what mainnet reports for a single-signer transfer.
        computeUnitsConsumed: 150,
        costUnits: 1481,
        err: null,
        fee: 5000,
        innerInstructions: [],
        logMessages: [
            'Program 11111111111111111111111111111111 invoke [1]',
            'Program log: Transfer of 1 SOL',
            'Program 11111111111111111111111111111111 success',
        ],
        postBalances: [999_990_000, 1_001_000_000, 1_000_000_000, 1],
        postTokenBalances: [
            {
                accountIndex: 2,
                mint: TOKEN_MINT.toBase58(),
                owner: RECIPIENT.toBase58(),
                programId: TOKEN_ACCOUNT.toBase58(),
                uiTokenAmount: {
                    amount: '1500000',
                    decimals: 6,
                    uiAmount: 1.5,
                    uiAmountString: '1.5',
                },
            },
        ],
        preBalances: [1_000_000_000, 0, 1_000_000_000, 1],
        preTokenBalances: [
            {
                accountIndex: 2,
                mint: TOKEN_MINT.toBase58(),
                owner: RECIPIENT.toBase58(),
                programId: TOKEN_ACCOUNT.toBase58(),
                uiTokenAmount: {
                    amount: '500000',
                    decimals: 6,
                    uiAmount: 0.5,
                    uiAmountString: '0.5',
                },
            },
        ],
        rewards: [],
    },
    slot: 312_456_789,
    transaction: {
        message: {
            accountKeys: [
                { pubkey: FEE_PAYER, signer: true, source: 'transaction', writable: true },
                { pubkey: RECIPIENT, signer: false, source: 'transaction', writable: true },
                { pubkey: TOKEN_ACCOUNT, signer: false, source: 'transaction', writable: true },
                {
                    pubkey: new PublicKey(SystemProgram.programId),
                    signer: false,
                    source: 'transaction',
                    writable: false,
                },
            ],
            addressTableLookups: [],
            instructions: [
                {
                    parsed: {
                        info: {
                            destination: RECIPIENT.toBase58(),
                            lamports: 1_000_000_000,
                            source: FEE_PAYER.toBase58(),
                        },
                        type: 'transfer',
                    },
                    program: 'system',
                    programId: new PublicKey(SystemProgram.programId),
                    stackHeight: null,
                },
            ],
            recentBlockhash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
        },
        signatures: [DEFAULT_SIGNATURE],
    },
    version: 'legacy',
} as unknown as ParsedTransactionWithMeta;

export const MOCK_PARSED_TX = mockParsedTransactionDetails({ transactionWithMeta: BASE_TX });

/** A transaction the cluster has not timestamped yet, so the summary renders its "Unavailable" row. */
export const MOCK_PARSED_TX_NO_BLOCK_TIME = mockParsedTransactionDetails({
    transactionWithMeta: { ...BASE_TX, blockTime: null },
});

/**
 * A Compute Budget `SetComputeUnitLimit` instruction in the shape the RPC serves it: a partially
 * decoded instruction whose data is base58, which is what the requested-CU estimator reads.
 */
function withComputeUnitLimit(units: number) {
    const data = alloc(5);
    data[0] = 2; // SetComputeUnitLimit
    writeUint32LE(data, units, 1);

    return {
        ...BASE_TX,
        transaction: {
            ...BASE_TX.transaction,
            message: {
                ...BASE_TX.transaction.message,
                // Appended, not prepended: the summary card reads instruction 0 to detect a nonce.
                instructions: [
                    ...BASE_TX.transaction.message.instructions,
                    {
                        accounts: [],
                        data: BASE58_DECODER.decode(data),
                        programId: ComputeBudgetProgram.programId,
                    },
                ],
            },
        },
    } as unknown as ParsedTransactionWithMeta;
}

/** Accurately budgeted: requests 1,000 compute units and consumes 150 of them. */
export const MOCK_TIGHT_BUDGET_TX = mockParsedTransactionDetails({
    transactionWithMeta: withComputeUnitLimit(1_000),
});

/**
 * A wallet's default 200,000 compute unit request left in place over a transfer that uses 150. The
 * executed cost the RPC reports is unchanged — only the *requested* cost, which SIMD-0553 charges
 * on, blows up.
 */
export const MOCK_LOOSE_BUDGET_TX = mockParsedTransactionDetails({
    transactionWithMeta: withComputeUnitLimit(200_000),
});

export const MOCK_FAILED_TX = mockParsedTransactionDetails({
    transactionWithMeta: {
        ...BASE_TX,
        meta: {
            ...BASE_TX.meta,
            err: { InstructionError: [0, 'GenericError'] },
            logMessages: [
                'Program 11111111111111111111111111111111 invoke [1]',
                'Program log: insufficient funds',
                'Program 11111111111111111111111111111111 failed: custom program error: 0x1',
            ],
        } as unknown as ParsedTransactionWithMeta['meta'],
    },
});

// Built from real wire bytes rather than a hand-picked number, so the size the summary renders is
// the size these bytes actually have.
const RAW_TX_BYTES = createWeb3TransactionBytes('legacy');
const RAW_MESSAGE_BYTES = parseTransactionBytes(RAW_TX_BYTES).messageBytes;
const RAW_MESSAGE = VersionedMessage.deserialize(RAW_MESSAGE_BYTES);

const RAW_TX: RawTransaction = {
    message: RAW_MESSAGE,
    messageBytes: RAW_MESSAGE_BYTES,
    serializedSize: RAW_TX_BYTES.length,
    signatures: [DEFAULT_SIGNATURE],
    transaction: TransactionMessage.decompile(RAW_MESSAGE),
    version: 'legacy',
};

export const MOCK_RAW_TX = mockRawTransactionDetails({ raw: { ...RAW_TX, blockTime: 1_716_000_000 } });

/** The same wire bytes before the block is confirmed, when the RPC reports no time yet. */
export const MOCK_RAW_TX_NO_BLOCK_TIME = mockRawTransactionDetails({ raw: RAW_TX });

export const MOCK_NO_LOGS_TX = mockParsedTransactionDetails({
    transactionWithMeta: {
        ...BASE_TX,
        meta: { ...BASE_TX.meta, logMessages: null } as unknown as ParsedTransactionWithMeta['meta'],
    },
});
