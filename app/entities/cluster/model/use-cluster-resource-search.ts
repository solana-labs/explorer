'use client';

import { Cluster, type ClusterSelection, clusterUrl, type ServerCluster } from '@utils/cluster';
import { useEffect, useRef, useState } from 'react';

export type ClusterSearchStatus = 'idle' | 'searching' | 'found' | 'not-found';

export interface ClusterResourceSearch {
    status: ClusterSearchStatus;
    searchingCluster: Cluster | undefined;
    foundCluster: Cluster | undefined;
}

/**
 * Probes a single cluster (reachable at `url`) for `resourceId`, resolving to whether it exists
 * there. Implementations differ only in the RPC call — e.g. getAccountInfo vs getSignatureStatuses.
 */
export type ClusterResourceProbe = (url: string, resourceId: string) => Promise<boolean>;

// The clusters this searches, and the only ones it may. Cluster.Custom is absent on purpose — see
// `getSelectionsToProbe`.
const PUBLIC_CLUSTERS: ServerCluster[] = [Cluster.MainnetBeta, Cluster.Devnet, Cluster.Testnet];
const PROBE_DELAY_MS = 700;

/**
 * Sequentially probes the other public clusters (and an optional custom RPC) for a resource that
 * was not found on the current cluster, reporting which cluster is being checked and where it was
 * found. Shared by the transaction and account "not found" cards; callers inject the `probe`.
 */
export function useClusterResourceSearch({
    resourceId,
    currentCluster,
    probe,
}: {
    resourceId: string;
    currentCluster: Cluster;
    probe: ClusterResourceProbe;
}): ClusterResourceSearch {
    const [status, setStatus] = useState<ClusterSearchStatus>('idle');
    const [searchingCluster, setSearchingCluster] = useState<Cluster | undefined>(undefined);
    const [foundCluster, setFoundCluster] = useState<Cluster | undefined>(undefined);

    // Monotonic id used to cancel a search whose inputs changed before it finished.
    const searchIdRef = useRef(0);
    // Track the latest probe without making it an effect dependency, so callers can pass an inline
    // function without restarting the search on every render.
    const probeRef = useRef(probe);
    probeRef.current = probe;

    useEffect(() => {
        const searchId = ++searchIdRef.current;
        const isStale = () => searchIdRef.current !== searchId;
        const selections = getSelectionsToProbe(currentCluster);

        async function searchClusters() {
            // Reset every output up front so a re-fired search never surfaces stale state, instead
            // of relying on React batching the synchronous setSearchingCluster below into the same flush.
            setStatus('searching');
            setSearchingCluster(undefined);
            setFoundCluster(undefined);

            for (const [index, selection] of selections.entries()) {
                if (isStale()) return;
                setSearchingCluster(selection.cluster);

                let found: boolean;
                try {
                    found = await probeRef.current(clusterUrl(selection), resourceId);
                } catch {
                    // Ignore probe errors (unreachable RPC, etc.) and try the next cluster
                    continue;
                }

                if (isStale()) return;

                if (found) {
                    setFoundCluster(selection.cluster);
                    setStatus('found');
                    return;
                }

                // Only pace between checks; skip the trailing delay so not-found shows immediately
                const isLastCluster = index === selections.length - 1;
                if (!isLastCluster) await sleep(PROBE_DELAY_MS);
            }

            if (isStale()) return;
            setStatus('not-found');
            setSearchingCluster(undefined);
        }

        searchClusters();

        return () => {
            // Invalidate this run so an in-flight probe cannot commit stale state after cleanup.
            if (!isStale()) searchIdRef.current += 1;
        };
    }, [resourceId, currentCluster]);

    return { foundCluster, searchingCluster, status };
}

/**
 * Public clusters only, and deliberately never a custom endpoint.
 *
 * This hook MUST NOT read `?customUrl=`. It fires on a not-found card, where the resource id is whatever
 * the visitor is looking at, and it probes with that id — so probing an endpoint from the query string
 * hands the address or signature to whoever wrote the link, before the consent prompt has been answered.
 * The param is still in the bar at that moment: a pending endpoint is kept on purpose, so the prompt keeps
 * its subject. Trust is decided in exactly one place (`decideCustomUrl`, via `useClusterUrl`), and reading
 * the param here would be a second, weaker answer.
 *
 * There is nothing to substitute from the cluster context either. An endpoint exists there only on the
 * Custom cluster, which is the cluster that just reported not-found, and `currentCluster` is excluded
 * below — so a context-sourced custom probe could never run. Left out rather than left dead.
 */
function getSelectionsToProbe(currentCluster: Cluster): ClusterSelection[] {
    return PUBLIC_CLUSTERS.filter(cluster => cluster !== currentCluster).map(cluster => ({ cluster }));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
