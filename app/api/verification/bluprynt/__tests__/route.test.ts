import { vi } from 'vitest';

import { Logger } from '@/app/shared/lib/logger';

const VALID_MINT = 'B61SyRxF2b8JwSLZHgEUF6rtn6NUikkrK1EMEgP6nhXW';

// Stable mock PDAs for schema versions and attestations
const MOCK_SCHEMA_PDA = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
const MOCK_ATTESTATION_PDA = '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi';

const mockGetMultipleAccounts = vi.fn();
const mockFindSchemaPda = vi.fn().mockResolvedValue([MOCK_SCHEMA_PDA, 255]);
const mockFindAttestationPda = vi.fn().mockResolvedValue([MOCK_ATTESTATION_PDA, 255]);

vi.mock('@solana/kit', async () => {
    const actual = await vi.importActual<typeof import('@solana/kit')>('@solana/kit');
    return {
        ...actual,
        createSolanaRpc: vi.fn(() => ({
            getMultipleAccounts: (...args: unknown[]) => ({
                send: async () => ({ value: await mockGetMultipleAccounts(...args) }),
            }),
        })),
    };
});

vi.mock('sas-lib', () => ({
    findAttestationPda: mockFindAttestationPda,
    findSchemaPda: mockFindSchemaPda,
}));

vi.mock('@utils/cluster', () => ({
    Cluster: { MainnetBeta: 'mainnet-beta' },
    serverClusterUrl: () => 'https://unused.test',
}));

vi.mock('../config', () => ({
    BLUPRYNT_CONFIG: {
        credentialAuthority: 'FygHgyQWuSHP9ob7Bt64gGrzRsuuxUbnAiKKeZDtCKeQ',
        schemaName: 'Test Schema',
    },
}));

const { GET } = await import('../[mintAddress]/route');

describe('Bluprynt API Route', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return 400 for an invalid mint address', async () => {
        const response = await callRoute('not-a-valid-key');
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Invalid mint address' });
    });

    it('should return verified true when any attestation account exists', async () => {
        const nulls = new Array(31).fill(null);
        mockGetMultipleAccounts.mockResolvedValueOnce([...nulls, { data: Buffer.alloc(0), lamports: 1 }]);
        const response = await callRoute(VALID_MINT);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ verified: true });
    });

    it('should return verified false when no attestation accounts exist', async () => {
        mockGetMultipleAccounts.mockResolvedValueOnce(new Array(32).fill(null));
        const response = await callRoute(VALID_MINT);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ verified: false });
    });

    it('should batch-check all schema versions in a single RPC call', async () => {
        mockGetMultipleAccounts.mockResolvedValueOnce(new Array(32).fill(null));
        await callRoute(VALID_MINT);
        expect(mockGetMultipleAccounts).toHaveBeenCalledTimes(1);
        const [[accounts]] = mockGetMultipleAccounts.mock.calls;
        expect(accounts).toHaveLength(32);
    });

    it('should return 504 with short negative cache when RPC request times out', async () => {
        const timeoutError = new DOMException('Signal timed out.', 'TimeoutError');
        mockGetMultipleAccounts.mockRejectedValueOnce(timeoutError);
        const response = await callRoute(VALID_MINT);
        expect(response.status).toBe(504);
        expect(await response.json()).toEqual({ error: 'Verification request timed out' });
        expect(response.headers.get('Cache-Control')).toBe('public, max-age=30, s-maxage=30');
        expect(Logger.warn).toHaveBeenCalledWith('[api:bluprynt] RPC request timed out', {
            mintAddress: VALID_MINT,
            sentry: true,
        });
    });

    it('should return 500 with short negative cache when RPC throws a non-timeout error', async () => {
        mockGetMultipleAccounts.mockRejectedValueOnce(new Error('Connection refused'));
        const response = await callRoute(VALID_MINT);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Failed to verify bluprynt data' });
        expect(response.headers.get('Cache-Control')).toBe('public, max-age=30, s-maxage=30');
        expect(Logger.panic).toHaveBeenCalled();
    });
});

function callRoute(mintAddress: string) {
    const request = new Request(`http://localhost:3000/api/verification/bluprynt/${mintAddress}`);
    return GET(request, { params: Promise.resolve({ mintAddress }) });
}
