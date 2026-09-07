import { ChainId, GENESIS_HASHES } from '@entities/chain-id';
import { renderHook, waitFor } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import type { ReactNode } from 'react';
import { SWRConfig, unstable_serialize } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTokenInfos } from '../../api/fetch-token-infos';
import type { TokenInfo } from '../../lib/types';
import { getTokenInfosSwrKey, useTokenInfos } from '../use-token-infos';

vi.mock('../../api/fetch-token-infos', () => ({ fetchTokenInfos: vi.fn() }));

const mockedFetch = vi.mocked(fetchTokenInfos);

function tokenInfo(address: string, verified = true): TokenInfo {
    return { address, decimals: 6, logoURI: null, name: address, symbol: address, verified };
}

// A fresh cache per test: SWR's default store is global, so a mint list resolved by one
// test would be served from cache to the next and skip the fetch.
function wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe('useTokenInfos', () => {
    beforeEach(() => {
        mockedFetch.mockReset();
        mockedFetch.mockResolvedValue(new Map());
    });

    it('should resolve the mints and expose them keyed by address', async () => {
        mockedFetch.mockResolvedValue(new Map([['mint-a', tokenInfo('mint-a')]]));
        const mints = ['mint-a'];

        const { result } = renderHook(() => useTokenInfos(mints, Cluster.MainnetBeta), { wrapper });

        await waitFor(() => expect(result.current.tokenInfos.get('mint-a')).toEqual(tokenInfo('mint-a')));
        expect(mockedFetch).toHaveBeenCalledWith(mints, Cluster.MainnetBeta, undefined);
    });

    it('should report loading until the lookup settles', async () => {
        const mints = ['mint-a'];

        const { result } = renderHook(() => useTokenInfos(mints, Cluster.MainnetBeta), { wrapper });

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('should expose an empty map while loading rather than undefined', () => {
        const { result } = renderHook(() => useTokenInfos(['mint-a'], Cluster.MainnetBeta), { wrapper });

        expect(result.current.tokenInfos.size).toBe(0);
    });

    it('should not fetch for an empty mint list', async () => {
        const { result } = renderHook(() => useTokenInfos([], Cluster.MainnetBeta), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockedFetch).not.toHaveBeenCalled();
        expect(result.current.tokenInfos.size).toBe(0);
    });

    it('should not refetch when the caller re-renders with a stable mint list', async () => {
        const mints = ['mint-a', 'mint-b'];

        const { rerender } = renderHook(() => useTokenInfos(mints, Cluster.MainnetBeta), { wrapper });
        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

        rerender();
        rerender();

        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch when the cluster changes', async () => {
        const mints = ['mint-a'];

        const { rerender } = renderHook(({ cluster }) => useTokenInfos(mints, cluster), {
            initialProps: { cluster: Cluster.MainnetBeta },
            wrapper,
        });
        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

        rerender({ cluster: Cluster.Devnet });

        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
        expect(mockedFetch).toHaveBeenLastCalledWith(mints, Cluster.Devnet, undefined);
    });

    it('should refetch when the mint list changes', async () => {
        const { rerender } = renderHook(({ mints }) => useTokenInfos(mints, Cluster.MainnetBeta), {
            initialProps: { mints: ['mint-a'] },
            wrapper,
        });
        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

        rerender({ mints: ['mint-a', 'mint-b'] });

        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    });

    it('should not refetch when an equal but freshly allocated mint list arrives', async () => {
        const { rerender } = renderHook(({ mints }) => useTokenInfos(mints, Cluster.MainnetBeta), {
            initialProps: { mints: ['mint-a', 'mint-b'] },
            wrapper,
        });
        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

        rerender({ mints: ['mint-a', 'mint-b'] });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('should forward the genesis hash', async () => {
        const mints = ['mint-a'];

        renderHook(() => useTokenInfos(mints, Cluster.Custom, GENESIS_HASHES.MAINNET), { wrapper });

        await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(mints, Cluster.Custom, GENESIS_HASHES.MAINNET));
    });

    it('should not fetch a custom cluster whose genesis hash resolves no chain id', async () => {
        const { result } = renderHook(() => useTokenInfos(['mint-a'], Cluster.Custom, 'not-a-genesis-hash'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockedFetch).not.toHaveBeenCalled();
    });

    // Storybook seeds this cache entry to render rows without a route to answer the lookup.
    it('should read an entry seeded under getTokenInfosSwrKey', () => {
        const mints = ['mint-a', 'mint-b'];
        const seeded = {
            [unstable_serialize(getTokenInfosSwrKey(mints, ChainId.MAINNET))]: new Map([
                ['mint-a', tokenInfo('mint-a')],
            ]),
        };

        const { result } = renderHook(() => useTokenInfos(mints, Cluster.MainnetBeta), {
            wrapper: ({ children }) => (
                <SWRConfig value={{ fallback: seeded, provider: () => new Map(), revalidateOnMount: false }}>
                    {children}
                </SWRConfig>
            ),
        });

        expect(result.current.tokenInfos.get('mint-a')).toEqual(tokenInfo('mint-a'));
        expect(mockedFetch).not.toHaveBeenCalled();
    });

    // The hash resolves a render after the cluster does, and it changes nothing on a named
    // cluster, so keying on it would buy a second lookup of the whole list for the same answer.
    it('should not refetch when the genesis hash arrives late on a named cluster', async () => {
        const mints = ['mint-a'];

        const { rerender } = renderHook(({ genesisHash }) => useTokenInfos(mints, Cluster.MainnetBeta, genesisHash), {
            initialProps: { genesisHash: undefined as string | undefined },
            wrapper,
        });
        await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

        rerender({ genesisHash: GENESIS_HASHES.MAINNET });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });
});
