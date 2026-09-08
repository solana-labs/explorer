import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    Cluster,
    type ClusterSelection,
    clusterSelection,
    clusterUrl,
    type ServerCluster,
    serverClusterUrl,
} from '../cluster';
import { DEFAULT_CUSTOM_URL, rpcEndpoint } from '../rpc-endpoint';

// In a hook, not a test body: a failed assertion would otherwise leave a blanked env var to decide what
// the describes below resolve, turning one failure into a cascade.
afterEach(() => vi.unstubAllEnvs());

const BLANKABLE_ENDPOINTS: [string, ServerCluster, string][] = [
    ['mainnet-beta', Cluster.MainnetBeta, 'NEXT_PUBLIC_MAINNET_RPC_URL'],
    ['testnet', Cluster.Testnet, 'NEXT_PUBLIC_TESTNET_RPC_URL'],
    ['devnet', Cluster.Devnet, 'NEXT_PUBLIC_DEVNET_RPC_URL'],
];

describe('ClusterSelection', () => {
    it('should refuse to pair an endpoint with a cluster that would ignore it', () => {
        // Asserted on the type: an unused `@ts-expect-error` is itself a tsc failure, so this breaks if
        // the pairing is loosened. Only Custom resolves to a supplied endpoint.
        // @ts-expect-error Only the Custom arm carries an endpoint.
        const wrong: ClusterSelection = { cluster: Cluster.Devnet, endpoint: rpcEndpoint('https://x.example') };

        expect(wrong.cluster).toBe(Cluster.Devnet);
    });

    it('should require an endpoint on the Custom cluster', () => {
        // The other half: Custom with nothing to connect to leaves each consumer inventing a fallback.
        // @ts-expect-error The Custom arm has no endpoint-less form.
        const wrong: ClusterSelection = { cluster: Cluster.Custom };

        expect(wrong.cluster).toBe(Cluster.Custom);
    });
});

describe('clusterUrl', () => {
    it('should resolve a Custom selection to its endpoint', () => {
        expect(clusterUrl(clusterSelection(Cluster.Custom, 'http://localhost:8900'))).toBe('http://localhost:8900');
    });

    it('should resolve every known cluster to its own endpoint, ignoring any custom URL', () => {
        const clusters: ServerCluster[] = [Cluster.MainnetBeta, Cluster.Testnet, Cluster.Devnet];

        for (const cluster of clusters) {
            const url = clusterUrl({ cluster });
            expect(() => new URL(url)).not.toThrow();
            expect(url).not.toBe('http://localhost:8900');
        }
    });

    // A deploy can leave one of these set but blank. An empty string is not an endpoint, and every
    // consumer keys its request on this value, reading an empty one as "no endpoint decided yet" — so a
    // blank var would leave the cards loading for good, with nothing logged and nothing to retry.
    //
    // Every arm, because the fix is per-arm: reverting one leaves that cluster alone broken.
    it.each(BLANKABLE_ENDPOINTS)(
        'should fall back to the public endpoint when %s is configured but blank',
        (_name, cluster, envVar) => {
            vi.stubEnv(envVar, '');

            expect(clusterUrl({ cluster })).toBeTruthy();
        },
    );
});

describe('clusterSelection', () => {
    it('should drop a custom URL passed for a cluster that cannot use one', () => {
        // Tests, stories and raw query params supply the two unpaired; they are paired here, once.
        expect(clusterSelection(Cluster.Devnet, 'http://localhost:8900')).toEqual({ cluster: Cluster.Devnet });
    });

    it('should fall back to the default endpoint for a Custom cluster with no URL', () => {
        expect(clusterSelection(Cluster.Custom).endpoint?.href).toBe(DEFAULT_CUSTOM_URL);
    });

    it('should throw on a Custom cluster whose URL is not an endpoint', () => {
        // A literal that cannot parse describes a state the app can never reach, so it fails loudly
        // rather than resolving to something plausible.
        expect(() => clusterSelection(Cluster.Custom, 'localhost:8899')).toThrow();
    });
});

describe('serverClusterUrl', () => {
    it('should resolve each non-custom cluster to its own valid endpoint', () => {
        const clusters: ServerCluster[] = [Cluster.MainnetBeta, Cluster.Testnet, Cluster.Devnet];
        const urls = clusters.map(serverClusterUrl);

        for (const url of urls) {
            expect(() => new URL(url)).not.toThrow();
        }
        expect(new Set(urls).size).toBe(urls.length);
    });

    it('should prefer the server env var over the public default', () => {
        vi.stubEnv('DEVNET_RPC_URL', 'https://private.devnet.example/rpc');
        expect(serverClusterUrl(Cluster.Devnet)).toBe('https://private.devnet.example/rpc');
        vi.unstubAllEnvs();
    });

    it('should exclude Custom from ServerCluster so the server cannot resolve a client URL', () => {
        // The compile error is the assertion. On the type, not on a call, so adding a `default:` branch
        // to `serverClusterUrl` cannot turn this into a false failure.
        const custom: Cluster = Cluster.Custom;
        // @ts-expect-error ServerCluster excludes Cluster.Custom.
        const asServerCluster: ServerCluster = custom;

        expect(asServerCluster).toBe(Cluster.Custom);
    });
});
