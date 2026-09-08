import { renderHook } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchNavigation } from '../use-search-navigation';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => new URLSearchParams('cluster=devnet&q=token'),
}));

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ cluster: Cluster.Devnet }),
}));

beforeEach(() => {
    pushMock.mockClear();
});

describe('useSearchNavigation', () => {
    it('should append current search params for plain pathnames', () => {
        const { result } = renderHook(() => useSearchNavigation());

        result.current({ label: 'Account', pathname: '/address/abc', value: ['abc'] });

        expect(pushMock).toHaveBeenCalledWith('/address/abc?cluster=devnet');
    });

    it('should merge cluster into pathname query string when pathname contains ?', () => {
        const { result } = renderHook(() => useSearchNavigation());

        result.current({ label: 'Inspector', pathname: '/tx/inspector?message=abc', value: ['abc'] });

        expect(pushMock).toHaveBeenCalledOnce();
        const pushed = pushMock.mock.calls[0][0] as string;
        const url = new URL(pushed, 'http://localhost');
        expect(url.pathname).toBe('/tx/inspector');
        expect(url.searchParams.get('message')).toBe('abc');
        expect(url.searchParams.get('cluster')).toBe('devnet');
    });

    it('should use the item cluster override instead of the current cluster', () => {
        const { result } = renderHook(() => useSearchNavigation());

        result.current({
            cluster: Cluster.Testnet,
            label: 'solscan.io — Account',
            pathname: '/address/abc',
            value: ['https://solscan.io/account/abc?cluster=testnet'],
        });

        expect(pushMock).toHaveBeenCalledWith('/address/abc?cluster=testnet');
    });

    it('should omit cluster param when item cluster override is MainnetBeta', () => {
        const { result } = renderHook(() => useSearchNavigation());

        result.current({
            cluster: Cluster.MainnetBeta,
            label: 'solscan.io — Account',
            pathname: '/address/abc',
            value: ['https://solscan.io/account/abc'],
        });

        // Current app cluster is devnet, but item overrides to mainnet — no param needed
        expect(pushMock).toHaveBeenCalledWith('/address/abc');
    });

    it('should preserve existing query params in pathname with ?', () => {
        const { result } = renderHook(() => useSearchNavigation());

        result.current({ label: 'Inspector', pathname: '/tx/inspector?message=abc&foo=bar', value: ['abc'] });

        const pushed = pushMock.mock.calls[0][0] as string;
        const url = new URL(pushed, 'http://localhost');
        expect(url.searchParams.get('message')).toBe('abc');
        expect(url.searchParams.get('foo')).toBe('bar');
        expect(url.searchParams.get('cluster')).toBe('devnet');
    });

    it('should preserve query values that contain "?" by splitting at the first occurrence only', () => {
        // A query value containing a literal '?' — split('?') would truncate at the second '?',
        // losing the rest of the value. indexOf + slice correctly takes everything after the first '?'.
        const { result } = renderHook(() => useSearchNavigation());

        result.current({ label: 'Inspector', pathname: '/tx/inspector?message=abc?extra', value: ['abc'] });

        const pushed = pushMock.mock.calls[0][0] as string;
        const url = new URL(pushed, 'http://localhost');
        expect(url.pathname).toBe('/tx/inspector');
        expect(url.searchParams.get('message')).toBe('abc?extra');
        expect(url.searchParams.get('cluster')).toBe('devnet');
    });
});
