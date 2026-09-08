import { Cluster } from '@utils/cluster';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../chain-id';
import { GENESIS_HASHES } from '../const';
import { getChainId } from '../get-chain-id';

describe('getChainId', () => {
    describe('standard clusters', () => {
        it.each([
            [Cluster.MainnetBeta, ChainId.MAINNET],
            [Cluster.Testnet, ChainId.TESTNET],
            [Cluster.Devnet, ChainId.DEVNET],
        ])('should return %s for cluster %s', (cluster, expected) => {
            expect(getChainId(cluster)).toBe(expected);
        });

        it.each([
            [Cluster.MainnetBeta, GENESIS_HASHES.DEVNET, ChainId.MAINNET],
            [Cluster.Testnet, GENESIS_HASHES.MAINNET, ChainId.TESTNET],
            [Cluster.Devnet, GENESIS_HASHES.TESTNET, ChainId.DEVNET],
        ])('should ignore genesisHash for %s cluster', (cluster, genesisHash, expected) => {
            expect(getChainId(cluster, genesisHash)).toBe(expected);
        });
    });

    describe('Custom cluster', () => {
        const cluster = Cluster.Custom;

        it('should return undefined when no genesisHash provided', () => {
            expect(getChainId(cluster)).toBeUndefined();
        });

        it.each([
            [GENESIS_HASHES.MAINNET, ChainId.MAINNET],
            [GENESIS_HASHES.DEVNET, ChainId.DEVNET],
            [GENESIS_HASHES.TESTNET, ChainId.TESTNET],
        ])('should return correct chainId for %s genesisHash', (genesisHash, expected) => {
            expect(getChainId(cluster, genesisHash)).toBe(expected);
        });

        it('should return undefined for unknown genesisHash', () => {
            expect(getChainId(cluster, 'unknown-genesis-hash')).toBeUndefined();
        });
    });
});
