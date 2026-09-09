import {
    type BlockData,
    type BlockTransaction,
    getBlockTransactionConfig,
    getBlockTransactionInstructions,
    isBlockTransaction,
} from '@entities/block-data';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LEGACY_BLOCK_RESPONSE, V1_BLOCK_RESPONSE } from '../../__fixtures__/block-responses';
import { fetchBlock } from '../fetch-block';

vi.mock('@solana/kit', async importOriginal => await importOriginal());

const URL = 'https://mock.rpc';
const SLOT = 440_572_822;
const fetchMock = vi.fn();

function respondWith(result: unknown) {
    const body = JSON.stringify({ id: 1, jsonrpc: '2.0', result });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => body });
}

function requestBody() {
    return JSON.parse(fetchMock.mock.calls[0][1].body);
}

function getTransaction(block: BlockData | null | undefined, index = 0): BlockTransaction {
    const transaction = block?.transactions[index];
    if (!transaction || !isBlockTransaction(transaction)) throw new Error(`Transaction ${index} is unavailable`);
    return transaction;
}

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('fetchBlock', () => {
    it('should ask for base64 transactions at the newest version Explorer renders', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        await fetchBlock(URL, SLOT);

        expect(requestBody().params).toEqual([
            SLOT,
            {
                commitment: 'confirmed',
                encoding: 'base64',
                maxSupportedTransactionVersion: 1,
                rewards: true,
                transactionDetails: 'full',
            },
        ]);
    });

    it('should return null when the RPC does not hold the block', async () => {
        respondWith(null);
        await expect(fetchBlock(URL, SLOT)).resolves.toBeNull();
    });

    it('should decode v1 messages and their config with kit', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        const transaction = getTransaction(await fetchBlock(URL, SLOT));

        expect(transaction.message.version).toBe(1);
        expect(getBlockTransactionConfig(transaction.message)).toEqual({
            computeUnitLimit: 10_000,
            loadedAccountsDataSizeLimit: 65_536,
        });
        expect(getBlockTransactionInstructions(transaction.message)).toHaveLength(1);
        expect(transaction.message.staticAccounts[2]).toBe('11111111111111111111111111111111');
    });

    it('should keep legacy messages kit-native', async () => {
        respondWith(LEGACY_BLOCK_RESPONSE);
        const transaction = getTransaction(await fetchBlock(URL, SLOT));

        expect(transaction.message.version).toBe('legacy');
        expect(getBlockTransactionConfig(transaction.message)).toBeUndefined();
    });

    it('should keep RPC quantities as bigints', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        const block = await fetchBlock(URL, SLOT);
        const meta = getTransaction(block).meta;

        expect(meta?.fee).toBe(5000n);
        expect(meta?.computeUnitsConsumed).toBe(150n);
        expect(block?.parentSlot).toBe(440_572_821n);
        expect(block?.blockTime).toBe(1_787_266_078n);
    });

    it('should ignore token balances that the block pages do not consume', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const tokenBalance = {
            accountIndex: 1,
            mint: 'So11111111111111111111111111111111111111112',
            uiTokenAmount: { amount: '25', decimals: 0, uiAmount: 25, uiAmountString: '25' },
        };
        const meta = {
            ...transaction.meta,
            postTokenBalances: [tokenBalance],
            preTokenBalances: [tokenBalance],
        };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);
        expect(getTransaction(block).message.version).toBe('legacy');
    });

    it('should retain an unavailable row at its original index when decoding fails', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        respondWith({
            ...LEGACY_BLOCK_RESPONSE,
            transactions: [{ ...transaction, transaction: ['not-base64-bytes', 'base64'] }, transaction],
        });

        const block = await fetchBlock(URL, SLOT);
        expect(block?.transactions).toHaveLength(2);
        expect(block?.transactions[0]).toEqual({ index: 0, unavailable: true });
        expect(getTransaction(block, 1).index).toBe(1);
    });

    it('should retain an unavailable row when required transaction metadata is invalid', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        const meta = { ...transaction.meta, fee: 'not-an-integer' };
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta }] });

        const block = await fetchBlock(URL, SLOT);
        expect(block?.transactions).toEqual([{ index: 0, unavailable: true }]);
    });

    it('should preserve null metadata', async () => {
        const [transaction] = LEGACY_BLOCK_RESPONSE.transactions;
        respondWith({ ...LEGACY_BLOCK_RESPONSE, transactions: [{ ...transaction, meta: null }] });

        expect(getTransaction(await fetchBlock(URL, SLOT)).meta).toBeNull();
    });

    it('should reject a block missing a field required by every block page', async () => {
        respondWith({ ...V1_BLOCK_RESPONSE, blockhash: undefined });
        await expect(fetchBlock(URL, SLOT)).rejects.toThrow();
    });

    it('should render transaction signatures in signer order', async () => {
        respondWith(V1_BLOCK_RESPONSE);
        expect(getTransaction(await fetchBlock(URL, SLOT)).signatures).toEqual([
            '3S16GMLh2fH28SAhXWRRqogYudd8MPvZD39Ee22ZS6F2jeJQLhYNpKfdkZxo49dnKDsoXvtdBxQFRaDbvd1QnZaW',
        ]);
    });
});
