// The cluster domain (enums, RPC-URL resolution) now lives in the `cluster` FSD entity. This file
// re-exports its pure lib so the ~180 existing `@utils/cluster` import sites — including server-side
// route handlers — keep working unchanged. Importing the entity lib directly (not the client `index.ts`)
// keeps this safe for server code, since `lib/cluster.ts` carries no `'use client'` boundary.
export {
    Cluster,
    clusterFromSlug,
    clusterName,
    clusterSelection,
    type ClusterSelection,
    clusterSlug,
    CLUSTERS,
    clusterUrl,
    ClusterStatus,
    DEFAULT_CLUSTER,
    DEVNET_URL,
    MAINNET_BETA_URL,
    type ServerCluster,
    serverClusterUrl,
    TESTNET_URL,
} from '@entities/cluster/lib/cluster';
