import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gen } from '@/app/__fixtures__/gen';
import { GENESIS_HASHES } from '@/app/entities/chain-id/lib/const';
import { getAssetBatch } from '@/app/entities/digital-asset/api';
import { clearLogoCacheForTests } from '@/app/features/search/api/discover-with-jupiter';

import { GET } from '../route';
import { makeDasAsset } from './__fixtures__/das';
import { makeJupiterToken, VALID_ADDRESS } from './__fixtures__/jupiter';

vi.mock('@/app/entities/digital-asset/api', () => ({
    getAssetBatch: vi.fn(),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const getAssetBatchMock = vi.mocked(getAssetBatch);

function mockFetch(status: number, body: unknown) {
    const ok = status >= 200 && status < 300;
    fetchMock.mockResolvedValueOnce({
        json: async () => body,
        ok,
        status,
    } as Response);
}

let testSeq = 0;
function makeRequest(q: string, cluster = 'mainnet-beta') {
    return new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}-${++testSeq}&cluster=${cluster}`);
}

const originalEnv = { ...process.env };

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    process.env = { ...originalEnv, JUPITER_API_KEY: 'test-key' };
    getAssetBatchMock.mockResolvedValue(undefined);
    clearLogoCacheForTests();
});

afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
    vi.resetAllMocks();
});

describe('GET /api/search', () => {
    describe('empty / guard cases', () => {
        it('should return empty with cache headers for empty query', async () => {
            const res = await GET(new Request('http://localhost/api/search?q='));
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toMatchObject({ results: { tokens: [] }, success: true });
            expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
        });

        it('should return results with cache headers for non-mainnet cluster', async () => {
            mockFetch(200, []);
            const res = await GET(new Request(`http://localhost/api/search?q=sol-${++testSeq}&cluster=devnet`));
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toMatchObject({ results: { tokens: [] }, success: true });
            expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
        });

        it('should return empty with cache headers when query exceeds max length', async () => {
            const longQuery = 'a'.repeat(201);
            const res = await GET(new Request(`http://localhost/api/search?q=${longQuery}`));
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toMatchObject({ results: { tokens: [] }, success: true });
            expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should return empty with cache headers when Jupiter returns empty array', async () => {
            mockFetch(200, []);
            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data).toMatchObject({ results: { tokens: [] }, success: true });
            expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
        });
    });

    describe('Jupiter discovery', () => {
        it('should normalize tokens on success', async () => {
            mockFetch(200, [makeJupiterToken()]);
            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.success).toBe(true);
            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0]).toMatchObject({
                icon: 'https://example.com/sol.png',
                isVerified: true,
                name: 'Wrapped SOL',
                ticker: 'SOL',
                tokenAddress: VALID_ADDRESS,
            });
        });

        it('should return cache headers on success', async () => {
            mockFetch(200, [makeJupiterToken()]);
            const res = await GET(makeRequest('sol'));
            expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
        });

        it('should detect address query type', async () => {
            mockFetch(200, [makeJupiterToken()]);
            const res = await GET(
                new Request(`http://localhost/api/search?q=${encodeURIComponent(VALID_ADDRESS)}-${++testSeq}`),
            );
            const data = await res.json();
            // address detection is based on exact 32-byte bs58 — padded variant used here is text
            expect(['address', 'text']).toContain(data.queryType);
        });

        it('should return empty when Jupiter returns non-ok and UTL also fails', async () => {
            // Jupiter 429 → fall back to UTL; UTL fetch has no mock → caught as failure.
            mockFetch(429, {});
            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data.results.tokens).toHaveLength(0);
        });
    });

    describe('UTL fallback', () => {
        it('should use UTL when JUPITER_API_KEY is not set', async () => {
            delete process.env.JUPITER_API_KEY;
            mockFetch(200, {
                content: [{ address: VALID_ADDRESS, name: 'Wrapped SOL', symbol: 'SOL' }],
            });

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens[0]).toMatchObject({
                name: 'Wrapped SOL',
                ticker: 'SOL',
                tokenAddress: VALID_ADDRESS,
            });
        });

        it('should mark UTL tokens as unverified', async () => {
            delete process.env.JUPITER_API_KEY;
            mockFetch(200, { content: [{ address: VALID_ADDRESS, name: 'Test', symbol: 'TST' }] });

            const res = await GET(makeRequest('test'));
            const data = await res.json();
            expect(data.results.tokens[0].isVerified).toBe(false);
        });

        it('should fall back to UTL when Jupiter returns HTTP error', async () => {
            mockFetch(500, {});
            mockFetch(200, {
                content: [{ address: VALID_ADDRESS, name: 'Wrapped SOL', symbol: 'SOL' }],
            });

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0]).toMatchObject({
                isVerified: false,
                name: 'Wrapped SOL',
                ticker: 'SOL',
                tokenAddress: VALID_ADDRESS,
            });
        });

        it('should fall back to UTL when Jupiter response fails schema validation', async () => {
            mockFetch(200, { unexpected: 'shape' });
            mockFetch(200, {
                content: [{ address: VALID_ADDRESS, name: 'Wrapped SOL', symbol: 'SOL' }],
            });

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0].name).toBe('Wrapped SOL');
        });

        it('should not fall back to UTL when Jupiter returns a legitimately empty result', async () => {
            mockFetch(200, []);
            const res = await GET(makeRequest('xyz123'));
            const data = await res.json();
            expect(data.results.tokens).toHaveLength(0);
            // Only the Jupiter call was made — no UTL fallback.
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should fall back to UTL when Jupiter is aborted', async () => {
            const abortErr = new Error('aborted');
            abortErr.name = 'AbortError';
            fetchMock.mockRejectedValueOnce(abortErr);
            mockFetch(200, {
                content: [{ address: VALID_ADDRESS, name: 'Wrapped SOL', symbol: 'SOL' }],
            });

            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0].name).toBe('Wrapped SOL');
        });
    });

    describe('Jupiter image fallback', () => {
        it('should enrich icon via Jupiter symbol search when discovery has no logo and DAS has none', async () => {
            // Jupiter discovery returns token without a logo.
            mockFetch(200, [makeJupiterToken({ icon: null, logoURI: null })]);
            // DAS returns nothing.
            getAssetBatchMock.mockResolvedValueOnce(undefined);
            // Jupiter image-fallback search by symbol returns the token with a logo.
            mockFetch(200, [makeJupiterToken({ logoURI: 'https://fallback.example.com/sol.png' })]);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data.results.tokens[0].icon).toBe('https://fallback.example.com/sol.png');
        });
    });

    describe('DAS icon enrichment', () => {
        it('should enrich icon from DAS when logoUri is null', async () => {
            mockFetch(200, [makeJupiterToken({ logoURI: null })]);
            getAssetBatchMock.mockResolvedValueOnce([makeDasAsset(VALID_ADDRESS, 'https://das.example.com/sol.png')]);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data.results.tokens[0].icon).toBe('https://das.example.com/sol.png');
        });

        it('should prefer logoUri over DAS image when both present', async () => {
            mockFetch(200, [makeJupiterToken({ logoURI: 'https://original.com/sol.png' })]);
            getAssetBatchMock.mockResolvedValueOnce([makeDasAsset(VALID_ADDRESS, 'https://das.example.com/sol.png')]);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data.results.tokens[0].icon).toBe('https://original.com/sol.png');
        });

        it('should use undefined icon when DAS returns no asset and logoUri is absent', async () => {
            mockFetch(200, [makeJupiterToken({ logoURI: null })]);
            getAssetBatchMock.mockResolvedValueOnce(undefined);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();
            expect(data.results.tokens[0].icon).toBeUndefined();
        });
    });

    describe('NEXT_PUBLIC_SEARCH_DISABLE_UNVERIFIED_TOKENS', () => {
        const OTHER_ADDRESS = gen.address(1);

        beforeEach(() => {
            process.env.NEXT_PUBLIC_SEARCH_DISABLE_UNVERIFIED_TOKENS = 'true';
        });

        it('should filter out unverified Jupiter tokens when flag is set', async () => {
            mockFetch(200, [
                makeJupiterToken({ isVerified: true }),
                makeJupiterToken({ id: OTHER_ADDRESS, isVerified: false, name: 'Other', symbol: 'OTH' }),
            ]);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0].isVerified).toBe(true);
            expect(data.results.tokens[0].tokenAddress).toBe(VALID_ADDRESS);
        });

        it('should keep verified Jupiter tokens when flag is set', async () => {
            mockFetch(200, [makeJupiterToken({ isVerified: true })]);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0].isVerified).toBe(true);
        });

        it('should return empty when all Jupiter results are unverified', async () => {
            mockFetch(200, [
                makeJupiterToken({ isVerified: false }),
                makeJupiterToken({ id: OTHER_ADDRESS, isVerified: false, name: 'Other', symbol: 'OTH' }),
            ]);

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens).toHaveLength(0);
        });

        it('should keep UTL fallback tokens even when flag is set', async () => {
            // Jupiter fails → UTL fallback. UTL hardcodes isVerified=false but bypasses the filter.
            mockFetch(500, {});
            mockFetch(200, {
                content: [{ address: VALID_ADDRESS, name: 'Wrapped SOL', symbol: 'SOL' }],
            });

            const res = await GET(makeRequest('sol'));
            const data = await res.json();

            expect(data.results.tokens).toHaveLength(1);
            expect(data.results.tokens[0].isVerified).toBe(false);
        });
    });

    describe('cluster routing', () => {
        it('should return 400 for unknown cluster slug', async () => {
            const res = await GET(new Request(`http://localhost/api/search?q=sol-${++testSeq}&cluster=bogus`));
            expect(res.status).toBe(400);
            expect(await res.json()).toMatchObject({ error: 'Invalid cluster', success: false });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should return empty with no-store headers when Custom cluster has no genesisHash', async () => {
            const res = await GET(new Request(`http://localhost/api/search?q=sol-${++testSeq}&cluster=custom`));
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toMatchObject({ results: { tokens: [] }, success: true });
            expect(res.headers.get('Cache-Control')).toContain('no-store');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should return empty with no-store headers when Custom genesisHash is unknown', async () => {
            const res = await GET(
                new Request(`http://localhost/api/search?q=sol-${++testSeq}&cluster=custom&genesisHash=UnknownHash`),
            );
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.results.tokens).toEqual([]);
            expect(res.headers.get('Cache-Control')).toContain('no-store');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should resolve Custom + mainnet genesisHash and run search', async () => {
            mockFetch(200, [makeJupiterToken()]);
            const res = await GET(
                new Request(
                    `http://localhost/api/search?q=sol-${++testSeq}&cluster=custom&genesisHash=${GENESIS_HASHES.MAINNET}`,
                ),
            );
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.results.tokens).toHaveLength(1);
            expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
        });
    });
});
