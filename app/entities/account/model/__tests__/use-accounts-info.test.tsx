import { PublicKey } from '@solana/web3.js';
import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountsInfo } from '../use-accounts-info';

const MOCK_URL = 'https://api.mainnet-beta.solana.com';
const MOCK_PUBKEY_1 = PublicKey.default;
const MOCK_PUBKEY_2 = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

vi.mock('swr', () => ({
    default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: false })),
}));

describe('useAccountsInfo', () => {
    beforeEach(() => {
        vi.mocked(useSWR).mockImplementation(
            () => ({ data: undefined, error: undefined, isLoading: false }) as ReturnType<typeof useSWR>,
        );
    });

    it('should pass null SWR key when pubkeys array is empty', () => {
        renderHook(() => useAccountsInfo([], MOCK_URL));

        expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function));
    });

    it('should pass the correct SWR key for a single pubkey', () => {
        renderHook(() => useAccountsInfo([MOCK_PUBKEY_1], MOCK_URL));

        expect(useSWR).toHaveBeenCalledWith(
            ['accounts-info', MOCK_PUBKEY_1.toBase58(), MOCK_URL],
            expect.any(Function),
        );
    });

    it('should pass the correct SWR key for multiple pubkeys', () => {
        renderHook(() => useAccountsInfo([MOCK_PUBKEY_1, MOCK_PUBKEY_2], MOCK_URL));

        const expectedKey = ['accounts-info', `${MOCK_PUBKEY_1.toBase58()},${MOCK_PUBKEY_2.toBase58()}`, MOCK_URL];
        expect(useSWR).toHaveBeenCalledWith(expectedKey, expect.any(Function));
    });

    it('should return an empty Map when no data is available', () => {
        const { result } = renderHook(() => useAccountsInfo([], MOCK_URL));

        expect(result.current.accounts).toBeInstanceOf(Map);
        expect(result.current.accounts.size).toBe(0);
    });

    it('should return data from SWR when available', () => {
        const mockAccounts = new Map([[MOCK_PUBKEY_1.toBase58(), { data: new Uint8Array([1, 2, 3]), size: 3 }]]);
        vi.mocked(useSWR).mockReturnValue({
            data: mockAccounts,
            error: undefined,
            isLoading: false,
        } as ReturnType<typeof useSWR>);

        const { result } = renderHook(() => useAccountsInfo([MOCK_PUBKEY_1], MOCK_URL));

        expect(result.current.accounts).toBe(mockAccounts);
    });

    it('should return error from SWR', () => {
        const mockError = new Error('fetch failed');
        vi.mocked(useSWR).mockReturnValue({
            data: undefined,
            error: mockError,
            isLoading: false,
        } as ReturnType<typeof useSWR>);

        const { result } = renderHook(() => useAccountsInfo([MOCK_PUBKEY_1], MOCK_URL));

        expect(result.current.error).toBe(mockError);
    });

    it('should return loading state from SWR', () => {
        vi.mocked(useSWR).mockReturnValue({
            data: undefined,
            error: undefined,
            isLoading: true,
        } as ReturnType<typeof useSWR>);

        const { result } = renderHook(() => useAccountsInfo([MOCK_PUBKEY_1], MOCK_URL));

        expect(result.current.loading).toBe(true);
    });

    it('should pass the fetcher to useSWR', () => {
        renderHook(() => useAccountsInfo([MOCK_PUBKEY_1], MOCK_URL));

        const fetcherArg = vi.mocked(useSWR).mock.calls[0][1];
        expect(fetcherArg).toBeTypeOf('function');
    });
});
