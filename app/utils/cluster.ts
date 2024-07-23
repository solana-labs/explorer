import explorerConfig from '@/explorer.config';

export enum ClusterStatus {
    Connected,
    Connecting,
    Failure,
}

export type Cluster = {
    cluster: string;
    name: string;
    uri: string;
};

export enum SolanaCluster {
    MainnetBeta = 'mainnet',
    Testnet = 'testnet',
    Devnet = 'devnet',
    Custom = 'custom',
}

class Clusters {
    private clusters: Cluster[];
    public default: Cluster;

    constructor(config: { clusters: Cluster[] }) {
        this.clusters = config.clusters;
        this.default = this.clusters[0];
    }

    get(clusterField: string): Cluster | undefined {
        return this.clusters.find(c => c.cluster === clusterField);
    }

    getAll(): Cluster[] {
        return this.clusters;
    }
}

export const clusters = new Clusters(explorerConfig);
