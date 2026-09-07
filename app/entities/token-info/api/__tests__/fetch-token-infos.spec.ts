import { Cluster } from '@utils/cluster';
import { fetchTokenInfosFromApi } from '@utils/token-info';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TOKEN_INFO_REQUEST_LIMIT } from '../../lib/request-limit';
import type { TokenInfo } from '../../lib/types';
import { fetchTokenInfos } from '../fetch-token-infos';

vi.mock('@utils/token-info', () => ({ fetchTokenInfosFromApi: vi.fn() }));

const mockedFetch = vi.mocked(fetchTokenInfosFromApi);

function tokenInfo(address: string, verified = true): TokenInfo {
    return { address, decimals: 6, logoURI: null, name: address, symbol: address, verified };
}

/** `n` distinct addresses, `addr-0` … `addr-(n-1)`. */
function addresses(n: number): string[] {
    return Array.from({ length: n }, (_, index) => `addr-${index}`);
}

describe('fetchTokenInfos', () => {
    beforeEach(() => {
        mockedFetch.mockReset();
        mockedFetch.mockResolvedValue([]);
    });

    it('should resolve a short list in a single request', async () => {
        mockedFetch.mockResolvedValue([tokenInfo('addr-0')]);

        const result = await fetchTokenInfos(addresses(20), Cluster.MainnetBeta);

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(mockedFetch).toHaveBeenCalledWith(
            expect.objectContaining({
                addresses: [...addresses(20)].sort(),
                cluster: Cluster.MainnetBeta,
                genesisHash: undefined,
                includeOnChainFallback: false,
            }),
        );
        expect(result.get('addr-0')).toEqual(tokenInfo('addr-0'));
    });

    // The upstream cache keys on the request body, so an unstable RPC order would miss it.
    it('should send the same body however the mints are ordered', async () => {
        await fetchTokenInfos(['c', 'a', 'b'], Cluster.MainnetBeta);
        await fetchTokenInfos(['b', 'c', 'a'], Cluster.MainnetBeta);

        const [firstBody, secondBody] = mockedFetch.mock.calls.map(call => call[0].addresses);
        expect(firstBody).toEqual(['a', 'b', 'c']);
        expect(secondBody).toEqual(firstBody);
    });

    it('should key the result by mint address', async () => {
        mockedFetch.mockResolvedValue([tokenInfo('addr-1', false), tokenInfo('addr-0', true)]);

        const result = await fetchTokenInfos(addresses(2), Cluster.MainnetBeta);

        expect(result.get('addr-0')?.verified).toBe(true);
        expect(result.get('addr-1')?.verified).toBe(false);
    });

    it('should omit mints the route did not resolve', async () => {
        mockedFetch.mockResolvedValue([tokenInfo('addr-0')]);

        const result = await fetchTokenInfos(addresses(3), Cluster.MainnetBeta);

        expect(result.size).toBe(1);
        expect(result.has('addr-1')).toBe(false);
    });

    it('should split a list longer than the request limit and merge the chunks', async () => {
        const all = addresses(TOKEN_INFO_REQUEST_LIMIT * 2 + 1);
        mockedFetch.mockImplementation(async ({ addresses: batch }) => batch.map(address => tokenInfo(address)));

        const result = await fetchTokenInfos(all, Cluster.MainnetBeta);

        expect(mockedFetch).toHaveBeenCalledTimes(3);
        for (const call of mockedFetch.mock.calls) {
            expect(call[0].addresses.length).toBeLessThanOrEqual(TOKEN_INFO_REQUEST_LIMIT);
        }
        expect(result.size).toBe(all.length);
    });

    it('should keep the resolved chunks when another chunk fails', async () => {
        const all = addresses(TOKEN_INFO_REQUEST_LIMIT + 1);
        // A failed request resolves to `undefined` rather than throwing.
        mockedFetch
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([tokenInfo(`addr-${TOKEN_INFO_REQUEST_LIMIT}`)]);

        const result = await fetchTokenInfos(all, Cluster.MainnetBeta);

        expect(result.size).toBe(1);
        expect(result.has(`addr-${TOKEN_INFO_REQUEST_LIMIT}`)).toBe(true);
    });

    it('should de-duplicate mints before chunking', async () => {
        await fetchTokenInfos(['a', 'b', 'a', 'b', 'a'], Cluster.MainnetBeta);

        expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ addresses: ['a', 'b'] }));
    });

    it('should forward the genesis hash', async () => {
        await fetchTokenInfos(['a'], Cluster.Custom, 'genesis-hash');

        expect(mockedFetch).toHaveBeenCalledWith(
            expect.objectContaining({ addresses: ['a'], cluster: Cluster.Custom, genesisHash: 'genesis-hash' }),
        );
    });

    it('should not call the route for an empty list', async () => {
        const result = await fetchTokenInfos([], Cluster.MainnetBeta);

        expect(mockedFetch).not.toHaveBeenCalled();
        expect(result.size).toBe(0);
    });

    it('should return an empty map when every chunk fails', async () => {
        mockedFetch.mockResolvedValue(undefined);

        const result = await fetchTokenInfos(addresses(5), Cluster.MainnetBeta);

        expect(result.size).toBe(0);
    });

    // `fetchAll` is a `Promise.all`, so a rejection would otherwise discard the chunks that
    // already resolved and reject the whole lookup, which no caller is prepared for.
    it('should keep the resolved chunks when another chunk rejects', async () => {
        const all = addresses(TOKEN_INFO_REQUEST_LIMIT + 1);
        mockedFetch
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce([tokenInfo(`addr-${TOKEN_INFO_REQUEST_LIMIT}`)]);

        const result = await fetchTokenInfos(all, Cluster.MainnetBeta);

        expect(result.size).toBe(1);
        expect(result.has(`addr-${TOKEN_INFO_REQUEST_LIMIT}`)).toBe(true);
    });

    it('should not reject when every chunk rejects', async () => {
        mockedFetch.mockRejectedValue(new Error('boom'));

        await expect(fetchTokenInfos(addresses(5), Cluster.MainnetBeta)).resolves.toEqual(new Map());
    });

    // Without one a stalled chunk holds the card's spinner for as long as the platform allows.
    it('should give each chunk its own abort signal', async () => {
        await fetchTokenInfos(addresses(TOKEN_INFO_REQUEST_LIMIT + 1), Cluster.MainnetBeta);

        const signals = mockedFetch.mock.calls.map(call => call[0].signal);
        expect(signals).toHaveLength(2);
        for (const signal of signals) {
            expect(signal).toBeInstanceOf(AbortSignal);
        }
        expect(signals[0]).not.toBe(signals[1]);
    });
});
