import { Cluster } from '@/app/utils/cluster';

export type WalletChain = 'solana:devnet' | 'solana:localnet' | 'solana:mainnet' | 'solana:testnet';

/**
 * Maps a cluster to the Wallet Standard chain identifier the wallet plugin is configured with.
 *
 * The identifier is not only a discovery filter: it is sent with every signature request, and
 * wallets use it to decide which network to preview the transaction against. A Custom cluster points at
 * an arbitrary endpoint, so it maps to `solana:localnet` — claiming mainnet would make wallets simulate
 * against the wrong network and warn about transactions that are fine.
 *
 * The cost is narrower discovery: a wallet that does not advertise `solana:localnet` will not be
 * offered there.
 */
export function clusterToWalletChain(cluster: Cluster): WalletChain {
    switch (cluster) {
        case Cluster.MainnetBeta:
            return 'solana:mainnet';
        case Cluster.Devnet:
            return 'solana:devnet';
        case Cluster.Testnet:
            return 'solana:testnet';
        default:
            return 'solana:localnet';
    }
}
