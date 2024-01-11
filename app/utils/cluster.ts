export enum ClusterStatus {
    Connected,
    Connecting,
    Failure,
}

export enum Cluster {
    MainnetBeta,
    Testnet,
    Devnet,
    Custom,
}

export const CLUSTERS = [Cluster.MainnetBeta, Cluster.Testnet, Cluster.Devnet, Cluster.Custom];

export function clusterSlug(cluster: Cluster): string {
    switch (cluster) {
        case Cluster.MainnetBeta:
            return 'mainnet-beta';
        case Cluster.Testnet:
            return 'testnet';
        case Cluster.Devnet:
            return 'devnet';
        case Cluster.Custom:
            return 'custom';
    }
}

export function clusterName(cluster: Cluster): string {
    switch (cluster) {
        case Cluster.MainnetBeta:
            return 'Mainnet Beta';
        case Cluster.Testnet:
            return 'Testnet';
        case Cluster.Devnet:
            return 'Devnet';
        case Cluster.Custom:
            return 'Custom';
    }
}

export const MAINNET_BETA_URL = 'https://api.mainnet-beta.solana.com';
export const TESTNET_URL = 'https://api.testnet.solana.com';
export const DEVNET_URL = 'https://api.devnet.solana.com';

export function clusterUrl(cluster: Cluster, customUrl: string): string {
    const modifyUrl = (url: string): string => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return url;
        } else {
            return url.replace('api', 'explorer-api');
        }
    };

    switch (cluster) {
        case Cluster.Devnet:
            return process.env.NEXT_PUBLIC_DEVNET_RPC_URL ?? modifyUrl(DEVNET_URL);
        case Cluster.MainnetBeta:
            return process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? modifyUrl(MAINNET_BETA_URL);
        case Cluster.Testnet:
            return process.env.NEXT_PUBLIC_TESTNET_RPC_URL ?? modifyUrl(TESTNET_URL);
        case Cluster.Custom:
            return customUrl;
    }
}

export const DEFAULT_CLUSTER = Cluster.MainnetBeta;
