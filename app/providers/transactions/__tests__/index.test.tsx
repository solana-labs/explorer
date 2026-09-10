import { DEFAULT_SIGNATURE } from '@__fixtures__/gen';
import { ActionType, type Dispatch, FetchStatus } from '@providers/cache';
import { Cluster } from '@utils/cluster';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTransactionStatus, type TransactionStatus } from '../index';

const MOCK_URL = 'https://api.mainnet-beta.solana.com';

const getSignatureStatuses = vi.fn();
const getRpc = vi.fn((_url: string) => ({
    getSignatureStatuses: (...args: unknown[]) => ({ send: () => getSignatureStatuses(...args) }),
}));
vi.mock('@entities/cluster', async importOriginal => ({
    ...((await importOriginal()) as Record<string, unknown>),
    getRpc: (...args: [string]) => getRpc(...args),
}));

// Silence Sentry, and keep a handle on it: the catch block reports every non-custom cluster.
const loggerError = vi.fn();
vi.mock('@/app/shared/lib/logger', () => ({ Logger: { error: (...args: unknown[]) => loggerError(...args) } }));

function status(overrides: Record<string, unknown> = {}) {
    return {
        confirmationStatus: 'confirmed',
        confirmations: 7n,
        err: null,
        slot: 1234n,
        ...overrides,
    };
}

const dispatch = vi.fn() as unknown as Dispatch<TransactionStatus>;

function lastUpdate() {
    const calls = vi.mocked(dispatch).mock.calls;
    return calls[calls.length - 1][0] as { data?: TransactionStatus; status: FetchStatus; type: ActionType };
}

beforeEach(() => {
    vi.resetAllMocks();
    getRpc.mockReturnValue({
        getSignatureStatuses: (...args: unknown[]) => ({ send: () => getSignatureStatuses(...args) }),
    });
});

describe('fetchTransactionStatus', () => {
    it('should convert kit bigints to numbers', async () => {
        getSignatureStatuses.mockResolvedValue({ value: [status()] });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        expect(getRpc).toHaveBeenCalledWith(MOCK_URL);
        expect(getSignatureStatuses).toHaveBeenCalledWith([DEFAULT_SIGNATURE], { searchTransactionHistory: true });
        expect(lastUpdate()).toMatchObject({
            data: {
                info: {
                    confirmationStatus: 'confirmed',
                    confirmations: 7,
                    result: { err: null },
                    slot: 1234,
                },
                signature: DEFAULT_SIGNATURE,
            },
            status: FetchStatus.Fetched,
        });
    });

    it('should not ask for the block time, which getTransaction already carries', async () => {
        getSignatureStatuses.mockResolvedValue({ value: [status()] });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        // One status call and nothing else: the summary reads the timestamp off the transaction fetch.
        expect(getSignatureStatuses).toHaveBeenCalledTimes(1);
        expect(lastUpdate().data?.info).not.toHaveProperty('timestamp');
    });

    it('should report max confirmations for a rooted signature', async () => {
        getSignatureStatuses.mockResolvedValue({
            value: [status({ confirmationStatus: 'finalized', confirmations: null })],
        });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        expect(lastUpdate().data?.info?.confirmations).toBe('max');
    });

    it('should drop a null confirmationStatus rather than leaking it downstream', async () => {
        getSignatureStatuses.mockResolvedValue({ value: [status({ confirmationStatus: null })] });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        const info = lastUpdate().data?.info;
        expect(info?.confirmationStatus).toBeUndefined();
        expect(info && 'confirmationStatus' in info).toBe(true);
    });

    it('should treat a null status entry as a fetched-but-missing signature', async () => {
        getSignatureStatuses.mockResolvedValue({ value: [null] });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        expect(lastUpdate()).toMatchObject({
            data: { info: null, signature: DEFAULT_SIGNATURE },
            status: FetchStatus.Fetched,
        });
    });

    it('should strip bigints out of the transaction error', async () => {
        getSignatureStatuses.mockResolvedValue({
            value: [status({ err: { InstructionError: [2n, { Custom: 6001n }] } })],
        });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        const err = lastUpdate().data?.info?.result.err;
        expect(err).toStrictEqual({ InstructionError: [2, { Custom: 6001 }] });
        expect(() => JSON.stringify(err)).not.toThrow();
    });

    it('should dispatch FetchFailed when the response carries the wrong number of statuses', async () => {
        getSignatureStatuses.mockResolvedValue({ value: [] });

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        expect(lastUpdate()).toMatchObject({ data: undefined, status: FetchStatus.FetchFailed });
    });

    it('should dispatch FetchFailed when the status request throws', async () => {
        getSignatureStatuses.mockRejectedValue(new Error('rpc boom'));

        await fetchTransactionStatus(dispatch, DEFAULT_SIGNATURE, Cluster.MainnetBeta, MOCK_URL);

        expect(lastUpdate()).toMatchObject({ data: undefined, status: FetchStatus.FetchFailed });
    });
});
