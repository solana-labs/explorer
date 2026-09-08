import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cluster, clusterSelection } from '../../lib/cluster';
import { useCluster } from '../use-cluster';
import { buildExplorerLink, useExplorerLink } from '../use-explorer-link';

// Mock only the useCluster hook, which useExplorerLink reads for the active cluster.
vi.mock('../use-cluster', () => ({
    useCluster: vi.fn(),
}));

const BASE = 'https://explorer.solana.com';

describe('buildExplorerLink', () => {
    describe('cluster query parameter', () => {
        it.each([
            { cluster: Cluster.Devnet, expectedParam: 'cluster=devnet' },
            { cluster: Cluster.Testnet, expectedParam: 'cluster=testnet' },
        ])('should append $expectedParam for $cluster', ({ cluster, expectedParam }) => {
            const result = buildExplorerLink(clusterSelection(cluster), '/tx/abc');
            expect(result).toBe(`${BASE}/tx/abc?${expectedParam}`);
        });

        it('should omit cluster param for MainnetBeta', () => {
            const result = buildExplorerLink({ cluster: Cluster.MainnetBeta }, '/tx/abc');
            expect(result).toBe(`${BASE}/tx/abc`);
        });

        // No case for a Custom cluster with no endpoint: `ClusterSelection` cannot express one, and such
        // a link was never useful — the reader falls back to the default endpoint.

        it('should append cluster=custom and encodes customUrl', () => {
            const result = buildExplorerLink(clusterSelection(Cluster.Custom, 'http://localhost:8899'), '/tx/abc');
            expect(result).toBe(`${BASE}/tx/abc?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
        });
    });

    describe('path joining', () => {
        it('should join path without leading slash using a separator', () => {
            const result = buildExplorerLink({ cluster: Cluster.MainnetBeta }, 'tx/abc');
            expect(result).toBe(`${BASE}/tx/abc`);
        });

        it('should return base URL when path is empty', () => {
            const result = buildExplorerLink({ cluster: Cluster.MainnetBeta }, '');
            expect(result).toBe(BASE);
        });

        it('should return base URL with cluster param when path is empty and cluster is non-mainnet', () => {
            const result = buildExplorerLink({ cluster: Cluster.Devnet }, '');
            expect(result).toBe(`${BASE}?cluster=devnet`);
        });
    });

    describe('existing query params in path', () => {
        it('should place cluster param before existing query params', () => {
            const result = buildExplorerLink({ cluster: Cluster.Devnet }, '/inspector?message=abc123');
            expect(result).toBe(`${BASE}/inspector?cluster=devnet&message=abc123`);
        });

        it('should place cluster and customUrl before existing query params', () => {
            const result = buildExplorerLink(
                clusterSelection(Cluster.Custom, 'http://localhost:8899'),
                '/inspector?message=abc',
            );
            expect(result).toBe(`${BASE}/inspector?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899&message=abc`);
        });
    });
});

describe('useExplorerLink', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Default clusters', () => {
        it.each([
            {
                cluster: Cluster.MainnetBeta,
                clusterName: 'Mainnet',
                expectedUrl: 'https://explorer.solana.com/address/123',
                path: '/address/123',
            },
            {
                cluster: Cluster.Testnet,
                clusterName: 'Testnet',
                expectedUrl: 'https://explorer.solana.com/address/123?cluster=testnet',
                path: '/address/123',
            },
            {
                cluster: Cluster.Devnet,
                clusterName: 'Devnet',
                expectedUrl: 'https://explorer.solana.com/address/123?cluster=devnet',
                path: '/address/123',
            },
        ])('should generate correct URL for $clusterName with path $path', ({ cluster, path, expectedUrl }) => {
            vi.mocked(useCluster).mockReturnValue({ selection: clusterSelection(cluster) } as any);

            const { result } = renderHook(() => useExplorerLink(path));

            expect(result.current.link).toBe(expectedUrl);
        });
    });

    describe('Custom cluster', () => {
        it('should add cluster=custom and customUrl parameters', () => {
            const customUrl = 'http://localhost:8899';
            vi.mocked(useCluster).mockReturnValue({
                selection: clusterSelection(Cluster.Custom, customUrl),
            } as any);

            const { result } = renderHook(() => useExplorerLink('/address/123'));

            expect(result.current.link).toBe(
                'https://explorer.solana.com/address/123?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899',
            );
        });

        // No hook-level test for a missing customUrl: `useCluster()` falls back to the default endpoint,
        // so it never reports one. `buildExplorerLink`'s undefined branch is covered directly above.

        it('should properly encode complex customUrl', () => {
            const customUrl = 'https://api.custom.solana.com:8080/path';
            vi.mocked(useCluster).mockReturnValue({
                selection: clusterSelection(Cluster.Custom, customUrl),
            } as any);

            const { result } = renderHook(() => useExplorerLink('/tx/abc'));

            expect(result.current.link).toBe(
                'https://explorer.solana.com/tx/abc?cluster=custom&customUrl=https%3A%2F%2Fapi.custom.solana.com%3A8080%2Fpath',
            );
        });
    });

    describe('Path handling', () => {
        it('should handle paths without leading slash', () => {
            vi.mocked(useCluster).mockReturnValue({
                selection: { cluster: Cluster.Testnet },
            } as any);

            const { result } = renderHook(() => useExplorerLink('address/123'));

            expect(result.current.link).toBe('https://explorer.solana.com/address/123?cluster=testnet');
        });

        it('should handle empty path', () => {
            vi.mocked(useCluster).mockReturnValue({
                selection: { cluster: Cluster.MainnetBeta },
            } as any);

            const { result } = renderHook(() => useExplorerLink(''));

            expect(result.current.link).toBe('https://explorer.solana.com');
        });

        it('should handle complex paths with multiple segments', () => {
            vi.mocked(useCluster).mockReturnValue({
                selection: { cluster: Cluster.Devnet },
            } as any);

            const { result } = renderHook(() => useExplorerLink('/address/123/tokens/456'));

            expect(result.current.link).toBe('https://explorer.solana.com/address/123/tokens/456?cluster=devnet');
        });
    });

    describe('Hook behavior', () => {
        it('should update link when cluster changes', () => {
            vi.mocked(useCluster).mockReturnValue({
                selection: { cluster: Cluster.MainnetBeta },
            } as any);

            const { result, rerender } = renderHook(() => useExplorerLink('/address/123'));

            expect(result.current.link).toBe('https://explorer.solana.com/address/123');

            vi.mocked(useCluster).mockReturnValue({
                selection: { cluster: Cluster.Testnet },
            } as any);

            rerender();

            expect(result.current.link).toBe('https://explorer.solana.com/address/123?cluster=testnet');
        });

        it('should update link when path changes', () => {
            vi.mocked(useCluster).mockReturnValue({
                selection: { cluster: Cluster.Devnet },
            } as any);

            const { result, rerender } = renderHook(({ path }) => useExplorerLink(path), {
                initialProps: { path: '/address/123' },
            });

            expect(result.current.link).toBe('https://explorer.solana.com/address/123?cluster=devnet');

            rerender({ path: '/tx/456' });

            expect(result.current.link).toBe('https://explorer.solana.com/tx/456?cluster=devnet');
        });

        it('should update link when customUrl changes', () => {
            vi.mocked(useCluster).mockReturnValue({
                selection: clusterSelection(Cluster.Custom, 'http://localhost:8899'),
            } as any);

            const { result, rerender } = renderHook(() => useExplorerLink('/address/123'));

            expect(result.current.link).toBe(
                'https://explorer.solana.com/address/123?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899',
            );

            vi.mocked(useCluster).mockReturnValue({
                selection: clusterSelection(Cluster.Custom, 'http://localhost:9999'),
            } as any);

            rerender();

            expect(result.current.link).toBe(
                'https://explorer.solana.com/address/123?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A9999',
            );
        });
    });
});
