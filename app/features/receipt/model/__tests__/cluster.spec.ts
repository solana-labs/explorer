import { describe, expect, it } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

import { getClusterParam, parseClusterId } from '../cluster';

describe('getClusterParam', () => {
    it('should return cluster from standard param', () => {
        expect(getClusterParam({ cluster: 'devnet' })).toBe('devnet');
    });

    it('should return cluster from HTML-entity-mangled param (amp;cluster)', () => {
        expect(getClusterParam({ 'amp;cluster': 'devnet', view: 'receipt' })).toBe('devnet');
    });

    it('should prefer standard param over amp;-prefixed param', () => {
        expect(getClusterParam({ 'amp;cluster': 'devnet', cluster: 'testnet' })).toBe('testnet');
    });

    it('should return undefined when no cluster param exists', () => {
        expect(getClusterParam({ view: 'receipt' })).toBe(undefined);
    });

    it('should return undefined for array values', () => {
        expect(getClusterParam({ cluster: ['devnet', 'testnet'] })).toBe(undefined);
    });
});

describe('parseClusterId', () => {
    it('should return undefined when value is undefined', () => {
        expect(parseClusterId(undefined)).toBe(undefined);
    });

    it.each([
        ['1', Cluster.Testnet],
        ['2', Cluster.Devnet],
    ])('should return cluster for valid id "%s"', (input, expected) => {
        expect(parseClusterId(input)).toBe(expected);
    });

    // '0' is mainnet (not allowed), '3' is custom (client-only), '999' out of range, 'devnet' → NaN, '' → 0 (mainnet)
    it.each(['0', '3', '999', 'devnet', ''])('should return undefined for invalid cluster id "%s"', input => {
        expect(parseClusterId(input)).toBe(undefined);
    });
});
