import { DEFAULT_CUSTOM_URL, type RpcEndpoint, rpcEndpoint } from './rpc-endpoint';

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

// On localhost we use the default public Solana RPCs (e.g. api.mainnet-beta.solana.com)
// unless custom ones (server + client) are specified via env vars.
// In deployed environments (production/preview) we rewrite to the explorer-api subdomain
// so the request goes to our own RPC instance.
//
// Custom RPC endpoints are configured via env vars in two tiers:
//   NEXT_PUBLIC_*_RPC_URL — exposed to the browser (clusterUrl).
//   *_RPC_URL             — server-only, used by SSR / API routes (serverClusterUrl).
//
// For production/preview deploys only the server-side var (*_RPC_URL) matters:
// the public one is auto-derived from the default constants + modifyUrl,
// so there is no need to set it.
// For custom RPCs that differ from the defaults you must set both:
// NEXT_PUBLIC_*_RPC_URL (client) and *_RPC_URL (server).
const modifyUrl = (url: string): string => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return url;
    } else {
        return url.replace('api', 'explorer-api');
    }
};

// Custom is the only cluster whose URL is not derivable; every other one resolves to a fixed configured
// URL and ignores a custom endpoint. Keeping the endpoint inside the Custom arm makes that the shape of
// the data, so no consumer has to re-derive "is this endpoint relevant?" for itself.
//
// `endpoint?: undefined` on the known-cluster arm lets consumers that want only `cluster` read it off a
// selection without narrowing first.
export type ClusterSelection =
    { cluster: ServerCluster; endpoint?: undefined } | { cluster: Cluster.Custom; endpoint: RpcEndpoint };

// `||`, not `??`: a var set to `""` is a blank setting rather than an endpoint, and an empty string
// reaches every consumer as "no endpoint decided yet" and waits there for good.
export function clusterUrl(selection: ClusterSelection): string {
    switch (selection.cluster) {
        case Cluster.Devnet:
            return process.env.NEXT_PUBLIC_DEVNET_RPC_URL || modifyUrl(DEVNET_URL);
        case Cluster.MainnetBeta:
            return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || modifyUrl(MAINNET_BETA_URL);
        case Cluster.Testnet:
            return process.env.NEXT_PUBLIC_TESTNET_RPC_URL || modifyUrl(TESTNET_URL);
        case Cluster.Custom:
            // No fallback branch: the type guarantees an endpoint here.
            return selection.endpoint.href;
    }
}

/**
 * Pairs a cluster with a URL string, for callers that hold a string rather than an `RpcEndpoint`: tests,
 * stories, raw query params. Throws on a Custom cluster with an unusable URL, so pass only literals and
 * already-validated values. Code holding a parsed endpoint should write the selection directly.
 */
export function clusterSelection(cluster: Cluster, customUrl?: string): ClusterSelection {
    if (cluster !== Cluster.Custom) return { cluster };
    return { cluster, endpoint: rpcEndpoint(customUrl ?? DEFAULT_CUSTOM_URL) };
}

// The clusters the Explorer server may resolve to an endpoint. Custom is excluded on purpose: its URL
// is client-supplied, so resolving it server-side would let a caller aim our server at any host. The
// exclusion makes that a compile error instead of a per-route runtime guard.
export type ServerCluster = Exclude<Cluster, Cluster.Custom>;

export function serverClusterUrl(cluster: ServerCluster): string {
    switch (cluster) {
        case Cluster.Devnet:
            return process.env.DEVNET_RPC_URL ?? modifyUrl(DEVNET_URL);
        case Cluster.MainnetBeta:
            return process.env.MAINNET_RPC_URL ?? modifyUrl(MAINNET_BETA_URL);
        case Cluster.Testnet:
            return process.env.TESTNET_RPC_URL ?? modifyUrl(TESTNET_URL);
    }
}

export function clusterFromSlug(slug: string): Cluster | undefined {
    return CLUSTERS.find(c => clusterSlug(c) === slug);
}

export const DEFAULT_CLUSTER = Cluster.MainnetBeta;
