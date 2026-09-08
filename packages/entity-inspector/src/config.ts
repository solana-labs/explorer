// Clusters the inspector can query — the single source of truth for the SupportedCluster type.
export const SUPPORTED_CLUSTERS = ['mainnet-beta', 'devnet', 'testnet'] as const;

export type SupportedCluster = (typeof SUPPORTED_CLUSTERS)[number];

/** A deployment's live subset of SUPPORTED_CLUSTERS; non-empty so the advertised enum and its default can never be empty. */
export type EnabledClusterNames = readonly [SupportedCluster, ...SupportedCluster[]];

export const DEFAULT_CLUSTER: SupportedCluster = 'mainnet-beta';

/** Falls back to the first enabled cluster so the default is always a value the advertised enum accepts. */
export function defaultCluster(clusterNames: EnabledClusterNames): SupportedCluster {
    return clusterNames.includes(DEFAULT_CLUSTER) ? DEFAULT_CLUSTER : clusterNames[0];
}
