import { DEFAULT_SIGNATURE } from '@__fixtures__/gen';
import type { CacheEntry } from '@providers/cache';
import { FetchStatus } from '@providers/cache';
import type { TransactionStatus } from '@providers/transactions';
import type { Details as ParsedDetails } from '@providers/transactions/parsed';
import type { Details as RawDetails } from '@providers/transactions/raw';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';

// Factories build well-typed CacheEntry<T> objects matching the real provider shapes.
// Each factory accepts a Partial<...> override so stories can vary specific fields without
// reconstructing the whole shape.

type StatusOverrides = Partial<{
    signature: string;
    slot: number;
    err: TransactionStatus['info'] extends infer T ? (T extends { result: { err: infer E } } ? E : null) : null;
    confirmations: number | 'max';
    confirmationStatus: 'processed' | 'confirmed' | 'finalized';
}>;

export function mockTransactionStatus(overrides: StatusOverrides = {}): CacheEntry<TransactionStatus> {
    const {
        signature = DEFAULT_SIGNATURE,
        slot = 312_456_789,
        err = null,
        confirmations = 'max',
        confirmationStatus = 'finalized',
    } = overrides;
    return {
        data: {
            info: { confirmationStatus, confirmations, result: { err }, slot },
            signature,
        },
        status: FetchStatus.Fetched,
    };
}

type ParsedOverrides = Partial<{
    transactionWithMeta: ParsedTransactionWithMeta | null;
}>;

export function mockParsedTransactionDetails(overrides: ParsedOverrides = {}): CacheEntry<ParsedDetails> {
    return {
        data: { transactionWithMeta: overrides.transactionWithMeta ?? null },
        status: FetchStatus.Fetched,
    };
}

type RawOverrides = Partial<RawDetails>;

export function mockRawTransactionDetails(overrides: RawOverrides = {}): CacheEntry<RawDetails> {
    return {
        data: { raw: overrides.raw ?? null },
        status: FetchStatus.Fetched,
    };
}
