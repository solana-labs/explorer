import { PublicKey } from '@solana/web3.js';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toBase64 } from '@/app/shared/lib/bytes';

import { useRawAccountData } from '../use-raw-account-data';

const MOCK_URL = 'https://api.mainnet-beta.solana.com';
const MOCK_ADDRESS = PublicKey.default.toBase58();

const mockGetAccountInfo = vi.fn();

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ url: MOCK_URL }),
}));

vi.mock('@entities/cluster/@x/account', async () => {
    const actual = await vi.importActual<typeof import('@entities/cluster/@x/account')>('@entities/cluster/@x/account');
    return {
        ...actual,
        getRpc: vi.fn(() => ({
            getAccountInfo: (...args: unknown[]) => ({
                send: async () => ({ value: await mockGetAccountInfo(...args) }),
            }),
        })),
    };
});

function accountInfoValue(data: Uint8Array) {
    return { data: [toBase64(data), 'base64'] };
}

function wrapper({ children }: { children: React.ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe('useRawAccountData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return undefined data initially', () => {
        const { result } = renderHook(() => useRawAccountData(MOCK_ADDRESS), { wrapper });

        expect(result.current.data).toBeUndefined();
    });

    it('should not be loading initially', () => {
        const { result } = renderHook(() => useRawAccountData(MOCK_ADDRESS), { wrapper });

        expect(result.current.isLoading).toBe(false);
    });

    it('should fetch raw data and return it when mutate is called', async () => {
        const mockData = new Uint8Array([4, 5, 6]);
        mockGetAccountInfo.mockResolvedValue(accountInfoValue(mockData));

        const { result } = renderHook(() => useRawAccountData(MOCK_ADDRESS), { wrapper });

        act(() => {
            result.current.mutate();
        });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData);
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should refetch data when mutate is called again', async () => {
        const mockData1 = new Uint8Array([4, 5, 6]);
        const mockData2 = new Uint8Array([7, 8, 9]);
        mockGetAccountInfo
            .mockResolvedValueOnce(accountInfoValue(mockData1))
            .mockResolvedValueOnce(accountInfoValue(mockData2));

        const { result } = renderHook(() => useRawAccountData(MOCK_ADDRESS), { wrapper });

        act(() => {
            result.current.mutate();
        });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData1);
        });

        // Call mutate again — should revalidate with fresh data
        act(() => {
            result.current.mutate();
        });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData2);
        });
    });
});
