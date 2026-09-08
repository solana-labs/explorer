import { describe, expect, it } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

import { clusterToWalletChain } from '../cluster-chain';

describe('clusterToWalletChain', () => {
    it.each([
        [Cluster.MainnetBeta, 'solana:mainnet'],
        [Cluster.Devnet, 'solana:devnet'],
        [Cluster.Testnet, 'solana:testnet'],
    ])('should map cluster %s to %s', (cluster, expected) => {
        expect(clusterToWalletChain(cluster)).toBe(expected);
    });

    it('should map the Custom cluster to localnet, since it points at an arbitrary endpoint', () => {
        expect(clusterToWalletChain(Cluster.Custom)).toBe('solana:localnet');
    });
});
