import { Cluster } from '@/app/utils/cluster';

import type { SearchParams } from '../lib/normalize-search-params';
import { normalizeSearchParams } from '../lib/normalize-search-params';

// Clusters that can be specified via URL query param (non-mainnet)
export type QueryCluster = Cluster.Devnet | Cluster.Testnet;

export function getClusterParam(searchParams: SearchParams): string | undefined {
    const normalized = normalizeSearchParams(searchParams);
    const value = normalized.cluster;
    return typeof value === 'string' ? value : undefined;
}

export function parseClusterId(value: string | undefined): QueryCluster | undefined {
    if (value === undefined) return value;
    const id = Number(value);
    if (id === Cluster.Devnet || id === Cluster.Testnet) {
        return id;
    }
    return undefined;
}
