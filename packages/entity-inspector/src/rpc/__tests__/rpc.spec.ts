import { createSolanaRpc } from '@solana/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RPC_REQUEST_TIMEOUT_MS } from '../../shared/constants.js';
import { createRpcClient, isSourceUnavailableError, SourceUnavailableError } from '../rpc.js';

const { getAccountInfoMock, getSignatureStatusesMock, getTransactionMock } = vi.hoisted(() => ({
    getAccountInfoMock: vi.fn(),
    getSignatureStatusesMock: vi.fn(),
    getTransactionMock: vi.fn(),
}));

vi.mock('@solana/kit', () => ({
    createSolanaRpc: vi.fn(() => ({
        getAccountInfo: getAccountInfoMock,
        getSignatureStatuses: getSignatureStatusesMock,
        getTransaction: getTransactionMock,
    })),
}));

const createSolanaRpcMock = vi.mocked(createSolanaRpc);

const RPC_ENDPOINTS = {
    devnet: 'https://devnet.rpc.address',
    'mainnet-beta': 'https://mainnet-beta.rpc.address',
    testnet: 'https://testnet.rpc.address',
};

const client = createRpcClient(RPC_ENDPOINTS);

describe('solana rpc adapter', () => {
    beforeEach(() => {
        createSolanaRpcMock.mockClear();
        getAccountInfoMock.mockReset();
        getSignatureStatusesMock.mockReset();
        getTransactionMock.mockReset();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('should fetch account info with deterministic defaults against the configured endpoint', async () => {
        const sendMock = vi.fn().mockResolvedValue({ value: null });
        getAccountInfoMock.mockReturnValue({ send: sendMock });

        const result = await client.fetchAccountInfo('address', 'devnet');

        expect(result).toEqual({ value: null });
        expect(createSolanaRpcMock).toHaveBeenCalledWith(RPC_ENDPOINTS.devnet);
        expect(getAccountInfoMock).toHaveBeenCalledWith('address', {
            commitment: 'finalized',
            encoding: 'jsonParsed',
        });
        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ abortSignal: expect.any(Object) }));
    });

    it('should honor explicit account info request options', async () => {
        getAccountInfoMock.mockReturnValue({ send: vi.fn().mockResolvedValue({ value: null }) });

        await client.fetchAccountInfo('address', 'devnet', { commitment: 'confirmed', encoding: 'base64' });

        expect(getAccountInfoMock).toHaveBeenCalledWith('address', {
            commitment: 'confirmed',
            encoding: 'base64',
        });
    });

    it('should map send TypeError failures to SourceUnavailableError without retry', async () => {
        const sendMock = vi.fn().mockRejectedValue(new TypeError('unexpected argument'));
        getAccountInfoMock.mockReturnValue({ send: sendMock });

        await expect(client.fetchAccountInfo('address', 'devnet')).rejects.toBeInstanceOf(SourceUnavailableError);
        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should map timeout-style abort failures to SourceUnavailableError', async () => {
        const timeoutSignal = AbortSignal.abort('timeout');
        const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
        const sendMock = vi.fn().mockImplementation(() => {
            const timeoutError = new Error('The operation timed out.');
            timeoutError.name = 'TimeoutError';
            return Promise.reject(timeoutError);
        });
        getAccountInfoMock.mockReturnValue({ send: sendMock });

        await expect(client.fetchAccountInfo('address', 'devnet')).rejects.toBeInstanceOf(SourceUnavailableError);
        expect(timeoutSpy).toHaveBeenCalledWith(RPC_REQUEST_TIMEOUT_MS);
        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(sendMock).toHaveBeenCalledWith({ abortSignal: timeoutSignal });
    });

    it('should fetch transaction with maxSupportedTransactionVersion = 0', async () => {
        const sendMock = vi.fn().mockResolvedValue({ slot: 1 });
        getTransactionMock.mockReturnValue({ send: sendMock });

        const result = await client.fetchTransaction('signature', 'mainnet-beta');

        expect(result).toEqual({ slot: 1 });
        expect(getTransactionMock).toHaveBeenCalledWith('signature', {
            commitment: 'finalized',
            encoding: 'json',
            maxSupportedTransactionVersion: 0,
        });
    });

    it('should honor explicit transaction request options', async () => {
        getTransactionMock.mockReturnValue({ send: vi.fn().mockResolvedValue(null) });

        await client.fetchTransaction('signature', 'mainnet-beta', {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 1,
        });

        expect(getTransactionMock).toHaveBeenCalledWith('signature', {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 1,
        });
    });

    it('should map RPC transport failures to SourceUnavailableError with cause chain', async () => {
        const originalError = new Error('socket hang up');
        getAccountInfoMock.mockReturnValue({ send: vi.fn().mockRejectedValue(originalError) });

        const wrapped = await client.fetchAccountInfo('address', 'mainnet-beta').catch((e: unknown) => e);
        expect(wrapped).toBeInstanceOf(SourceUnavailableError);
        expect(wrapped).toMatchObject({
            cause: originalError,
            message: expect.stringContaining('socket hang up'),
        });
    });

    it('should stringify non-Error rejections into the SourceUnavailableError message', async () => {
        getAccountInfoMock.mockReturnValue({ send: vi.fn().mockRejectedValue('boom') });

        const wrapped = await client.fetchAccountInfo('address', 'mainnet-beta').catch((e: unknown) => e);
        expect(isSourceUnavailableError(wrapped)).toBe(true);
        expect(wrapped).toMatchObject({ message: expect.stringContaining('boom') });
    });

    it('should map transaction transport failures to SourceUnavailableError', async () => {
        getTransactionMock.mockReturnValue({ send: vi.fn().mockRejectedValue(new Error('socket hang up')) });

        await expect(client.fetchTransaction('signature', 'mainnet-beta')).rejects.toBeInstanceOf(
            SourceUnavailableError,
        );
    });

    it('should fetch DAS getAsset through the direct JSON-RPC path', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ result: { id: 'asset-id' } }), {
                headers: { 'content-type': 'application/json' },
                status: 200,
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const result = await client.fetchAsset('asset-id', 'devnet');

        expect(result).toEqual({ id: 'asset-id' });
        expect(fetchMock).toHaveBeenCalledWith(RPC_ENDPOINTS.devnet, expect.objectContaining({ method: 'POST' }));
    });

    it('should resolve null for DAS JSON-RPC errors such as asset-not-found', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ error: { code: -32000, message: 'Asset Not Found' } }), {
                headers: { 'content-type': 'application/json' },
                status: 200,
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(client.fetchAsset('asset-id', 'devnet')).resolves.toBeNull();
    });

    it('should map non-OK DAS HTTP responses to SourceUnavailableError', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(client.fetchAsset('asset-id', 'devnet')).rejects.toBeInstanceOf(SourceUnavailableError);
    });

    it('should throw for a non-benign DAS error code carried in a 200 body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ error: { code: -32005, message: 'rate limited' } }), {
                headers: { 'content-type': 'application/json' },
                status: 200,
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(client.fetchAsset('asset-id', 'devnet')).rejects.toBeInstanceOf(SourceUnavailableError);
    });

    it('should throw for a DAS error body with no code', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ error: { message: 'boom' } }), {
                headers: { 'content-type': 'application/json' },
                status: 200,
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(client.fetchAsset('asset-id', 'devnet')).rejects.toBeInstanceOf(SourceUnavailableError);
    });

    it('should fetch signature status with searchTransactionHistory', async () => {
        const sendMock = vi.fn().mockResolvedValue({
            value: [{ confirmationStatus: 'finalized', confirmations: null }],
        });
        getSignatureStatusesMock.mockReturnValue({ send: sendMock });

        const result = await client.fetchSignatureStatus('signature', 'mainnet-beta');

        expect(result).toEqual({ value: { confirmationStatus: 'finalized', confirmations: null } });
        expect(getSignatureStatusesMock).toHaveBeenCalledWith(['signature'], { searchTransactionHistory: true });
    });

    it('should map signature status transport failures to SourceUnavailableError', async () => {
        getSignatureStatusesMock.mockReturnValue({ send: vi.fn().mockRejectedValue(new Error('socket hang up')) });

        await expect(client.fetchSignatureStatus('signature', 'mainnet-beta')).rejects.toBeInstanceOf(
            SourceUnavailableError,
        );
    });

    it('should return null value when signature not found in status array', async () => {
        getSignatureStatusesMock.mockReturnValue({ send: vi.fn().mockResolvedValue({ value: [null] }) });

        const result = await client.fetchSignatureStatus('signature', 'mainnet-beta');
        expect(result).toEqual({ value: null });
    });

    it('should throw SourceUnavailableError on empty status array', async () => {
        getSignatureStatusesMock.mockReturnValue({ send: vi.fn().mockResolvedValue({ value: [] }) });

        await expect(client.fetchSignatureStatus('signature', 'mainnet-beta')).rejects.toBeInstanceOf(
            SourceUnavailableError,
        );
    });
});
