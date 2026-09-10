import { gen } from '@__fixtures__/gen';
import type * as SolanaKit from '@solana/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toBase64 } from '@/app/shared/lib/bytes';

import {
    createV1TransactionBytes,
    createWeb3TransactionBytes,
    FEE_PAYER,
    RECIPIENT,
} from '../../__fixtures__/wire-transactions';
import { fetchRawTransaction } from '../fetch-raw-transaction';

// The global setup stubs `createSolanaRpc` so no test reaches the network; these tests exercise the
// real client against a stubbed `fetch` instead.
vi.mock('@solana/kit', async () => await vi.importActual<typeof SolanaKit>('@solana/kit'));

const URL = 'https://mock.rpc';
const SIGNATURE = gen.signature(1);

const fetchMock = vi.fn();

function respondWith(result: unknown) {
    const body = JSON.stringify({ id: 1, jsonrpc: '2.0', result });
    // kit reads the body as text so it can upcast integers to bigints as it parses.
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => body });
}

function transactionResult(bytes: Uint8Array, meta: unknown = null, version: unknown = 1) {
    return { blockTime: 1_778_761_079, meta, slot: 372_654_321, transaction: [toBase64(bytes), 'base64'], version };
}

function requestBody() {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
}

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('fetchRawTransaction', () => {
    it('should ask for base64 bytes at the newest version Explorer renders', async () => {
        respondWith(transactionResult(createV1TransactionBytes({})));

        await fetchRawTransaction(URL, SIGNATURE, 'confirmed');

        expect(requestBody().params).toEqual([
            SIGNATURE,
            { commitment: 'confirmed', encoding: 'base64', maxSupportedTransactionVersion: 1 },
        ]);
    });

    it('should default to confirmed so a freshly landed transaction still answers', async () => {
        respondWith(transactionResult(createV1TransactionBytes({})));

        await fetchRawTransaction(URL, SIGNATURE);

        // At the RPC default of `finalized` a confirmed-but-unrooted transaction comes back null, which
        // leaves the size and the timestamp blank on a page that has already rendered everything else.
        expect(requestBody().params[1].commitment).toBe('confirmed');
    });

    it('should carry the block time, which spares the page a getBlockTime for the same slot', async () => {
        respondWith(transactionResult(createV1TransactionBytes({})));

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.blockTime).toBe(1_778_761_079);
    });

    it('should leave a missing block time absent rather than defaulting it', async () => {
        respondWith({ ...transactionResult(createV1TransactionBytes({})), blockTime: null });

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.blockTime).toBeUndefined();
    });

    it('should return null when the RPC does not hold the transaction', async () => {
        respondWith(null);

        await expect(fetchRawTransaction(URL, SIGNATURE)).resolves.toBeNull();
    });

    it('should expose a v1 transaction as bytes and resource limits, without a web3.js view', async () => {
        const bytes = createV1TransactionBytes({ computeUnitLimit: 8442, priorityFeeLamports: 10_000n });
        respondWith(transactionResult(bytes));

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.version).toBe(1);
        expect(raw?.transactionConfig).toEqual({
            computeUnitLimit: 8442,
            heapSize: undefined,
            loadedAccountsDataSizeLimit: undefined,
            priorityFeeLamports: 10_000n,
        });
        expect(raw?.message).toBeUndefined();
        expect(raw?.transaction).toBeUndefined();
        expect(bytes.subarray(0, raw?.messageBytes.length)).toEqual(raw?.messageBytes);
    });

    it('should read every resource limit a v1 message carries', async () => {
        respondWith(
            transactionResult(
                createV1TransactionBytes({
                    computeUnitLimit: 8442,
                    heapSize: 262_144,
                    loadedAccountsDataSizeLimit: 75_013,
                    priorityFeeLamports: 10_000n,
                }),
            ),
        );

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.transactionConfig).toEqual({
            computeUnitLimit: 8442,
            heapSize: 262_144,
            loadedAccountsDataSizeLimit: 75_013,
            priorityFeeLamports: 10_000n,
        });
    });

    it('should leave the resource limits undefined for a v1 message that sets none', async () => {
        respondWith(transactionResult(createV1TransactionBytes({})));

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.version).toBe(1);
        expect(raw?.transactionConfig).toBeUndefined();
    });

    it.each(['legacy' as const, 0 as const])(
        'should decode a %s transaction into the web3.js views the inspector renders',
        async version => {
            respondWith(transactionResult(createWeb3TransactionBytes(version), null, version));

            const raw = await fetchRawTransaction(URL, SIGNATURE);

            expect(raw?.version).toBe(version);
            expect(raw?.message?.staticAccountKeys[0].toBase58()).toBe(FEE_PAYER);
            expect(raw?.transaction?.instructions).toHaveLength(1);
            // Only v1 carries message-level limits.
            expect(raw?.transactionConfig).toBeUndefined();
        },
    );

    it.each(['legacy' as const, 0 as const, 1 as const])(
        'should report the wire size of a %s transaction, signatures included',
        async version => {
            const bytes = version === 1 ? createV1TransactionBytes({}) : createWeb3TransactionBytes(version);
            respondWith(transactionResult(bytes, null, version));

            const raw = await fetchRawTransaction(URL, SIGNATURE);

            // The whole payload, not just the message — that is what the size limit applies to.
            expect(raw?.serializedSize).toBe(bytes.length);
            expect(raw?.serializedSize).toBeGreaterThan(raw?.messageBytes.length ?? 0);
        },
    );

    it('should leave an unsigned signer slot undefined so it is not reported as an invalid signature', async () => {
        respondWith(transactionResult(createV1TransactionBytes({})));

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.signatures).toEqual([undefined]);
    });

    it('should narrow the balances and inner instructions the inspector reads', async () => {
        respondWith(
            transactionResult(createWeb3TransactionBytes('legacy'), {
                innerInstructions: [
                    { index: 0, instructions: [{ accounts: [1, 2], data: '3Bxs4', programIdIndex: 3 }] },
                ],
                loadedAddresses: { readonly: [RECIPIENT], writable: [FEE_PAYER] },
                postBalances: [900_000_000, 100_000_000],
                preBalances: [1_000_000_000, 0],
            }),
        );

        const raw = await fetchRawTransaction(URL, SIGNATURE);

        expect(raw?.meta?.preBalances).toEqual([1_000_000_000, 0]);
        expect(raw?.meta?.postBalances).toEqual([900_000_000, 100_000_000]);
        expect(raw?.meta?.innerInstructions).toEqual([
            { index: 0, instructions: [{ accounts: [1, 2], data: '3Bxs4', programIdIndex: 3 }] },
        ]);
    });

    it('should reject when the RPC call fails, so the provider can report the failure', async () => {
        fetchMock.mockResolvedValueOnce({
            headers: new Headers(),
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
        });

        await expect(fetchRawTransaction(URL, SIGNATURE)).rejects.toThrow();
    });
});
