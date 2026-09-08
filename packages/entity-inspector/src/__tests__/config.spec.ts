import { describe, expect, it } from 'vitest';

import { defaultCluster, SUPPORTED_CLUSTERS } from '../config.js';

describe('SUPPORTED_CLUSTERS', () => {
    it('should list the clusters the inspector can query', () => {
        expect(SUPPORTED_CLUSTERS).toEqual(['mainnet-beta', 'devnet', 'testnet']);
    });
});

describe('defaultCluster', () => {
    it('should prefer mainnet-beta when it is enabled', () => {
        expect(defaultCluster(['devnet', 'mainnet-beta'])).toBe('mainnet-beta');
    });

    // Guards the schema's `.default()` from ever naming a value its own enum rejects.
    it('should fall back to the first cluster when mainnet-beta is withheld', () => {
        expect(defaultCluster(['testnet', 'devnet'])).toBe('testnet');
    });
});
