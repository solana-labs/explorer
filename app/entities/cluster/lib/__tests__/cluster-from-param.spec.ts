import { afterEach, describe, expect, it, vi } from 'vitest';

import { Cluster } from '../cluster';
import { clusterFromParam, resolveServerClusterUrl, serverClusterUrlFromParam } from '../cluster-from-param';

// In a hook, not a test body: a failed assertion would otherwise leave a blanked env var to decide what
// the describes below resolve, turning one failure into a cascade.
afterEach(() => vi.unstubAllEnvs());

describe('clusterFromParam', () => {
    it('should parse each known cluster value', () => {
        expect(clusterFromParam('0')).toBe(Cluster.MainnetBeta);
        expect(clusterFromParam('1')).toBe(Cluster.Testnet);
        expect(clusterFromParam('2')).toBe(Cluster.Devnet);
        expect(clusterFromParam('3')).toBe(Cluster.Custom);
    });

    it('should return undefined for out-of-range numbers', () => {
        expect(clusterFromParam('4')).toBeUndefined();
        expect(clusterFromParam('-1')).toBeUndefined();
        expect(clusterFromParam('999')).toBeUndefined();
    });

    it('should return undefined for non-numeric strings', () => {
        expect(clusterFromParam('mainnet-beta')).toBeUndefined();
        expect(clusterFromParam('')).toBeUndefined();
        expect(clusterFromParam('NaN')).toBeUndefined();
    });
});

// A route that cannot tell these two apart either reports every caller's typo, or says nothing at all
// about its own deployment having no endpoint for a cluster it serves.
describe('resolveServerClusterUrl', () => {
    it('should resolve a known cluster', () => {
        expect(resolveServerClusterUrl('0')).toEqual({
            cluster: Cluster.MainnetBeta,
            kind: 'ok',
            url: expect.any(String),
        });
    });

    it.each([
        ['the custom cluster', '3'],
        ['an unknown cluster', '999'],
        ['a malformed param', '01'],
    ])('should refuse %s as the caller’s input', (_reason, value) => {
        expect(resolveServerClusterUrl(value)).toEqual({ kind: 'refused' });
    });

    it('should name a cluster it serves with no endpoint set as ours to fix', () => {
        vi.stubEnv('MAINNET_RPC_URL', '');

        expect(resolveServerClusterUrl('0')).toEqual({ cluster: Cluster.MainnetBeta, kind: 'unconfigured' });
    });
});

describe('serverClusterUrlFromParam', () => {
    it('should resolve a known cluster to a non-empty server URL', () => {
        expect(serverClusterUrlFromParam('0')).toEqual(expect.any(String));
        expect(serverClusterUrlFromParam('0')).toBeTruthy();
    });

    it('should return undefined for a custom cluster (no server endpoint)', () => {
        // Custom short-circuits before `serverClusterUrl`, which cannot resolve it. Custom is client-only.
        expect(serverClusterUrlFromParam('3')).toBeUndefined();
    });

    it('should return undefined when the cluster env var is set to an empty string', () => {
        // `??` in `serverClusterUrl` does not fall back on `''`, so guard it here: callers test for
        // `undefined`, and an empty URL would otherwise read as a valid endpoint.
        vi.stubEnv('MAINNET_RPC_URL', '');
        expect(serverClusterUrlFromParam('0')).toBeUndefined();
        vi.unstubAllEnvs();
    });

    it('should reject the same malformed params as clusterFromParam (no bare Number() coercion)', () => {
        expect(serverClusterUrlFromParam('999')).toBeUndefined();
        expect(serverClusterUrlFromParam('01')).toBeUndefined();
        expect(serverClusterUrlFromParam(' 0 ')).toBeUndefined();
        expect(serverClusterUrlFromParam('')).toBeUndefined();
    });
});
