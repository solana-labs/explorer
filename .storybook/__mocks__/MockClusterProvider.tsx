// Skips ClusterProvider's mount-time health check (getGenesisHash) and seeds the epoch hooks'
// SWR cache so consumers render epoch/schedule data without any network call.

import { toConnectableUrl } from '@entities/cluster';
import { type ClusterInfo, clusterModalOpenAtom, type ClusterState, StateContext } from '@providers/cluster';
import { Cluster, clusterSelection, ClusterStatus, clusterUrl } from '@utils/cluster';
import { useHydrateAtoms } from 'jotai/utils';
import { type ReactNode, useState } from 'react';
import { SWRConfig, unstable_serialize } from 'swr';

const defaultSelection = clusterSelection(Cluster.MainnetBeta);

const defaultState: ClusterState = {
    connectableUrl: toConnectableUrl(clusterUrl(defaultSelection)),
    genesisHash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
    selection: defaultSelection,
    status: ClusterStatus.Connected,
};

const defaultClusterInfo: ClusterInfo = {
    epochInfo: {
        absoluteSlot: 312_456_789n,
        blockHeight: 295_456_321n,
        epoch: 520n,
        slotIndex: 156_789n,
        slotsInEpoch: 432_000n,
    },
    epochSchedule: {
        firstNormalEpoch: 14n,
        firstNormalSlot: 524_256n,
        slotsPerEpoch: 432_000n,
    },
};

type Props = {
    children: ReactNode;
    state?: ClusterState;
    /** Seeds the epoch hooks' SWR cache. Pass `null` to leave it empty (loading state). */
    clusterInfo?: ClusterInfo | null;
    modalOpen?: boolean;
};

export function MockClusterProvider({
    children,
    state = defaultState,
    clusterInfo = defaultClusterInfo,
    modalOpen = false,
}: Props) {
    const [current] = useState<ClusterState>(state);
    // Seed the modal atom into the ambient jotai store (the story's own store, or the default one).
    useHydrateAtoms([[clusterModalOpenAtom, modalOpen]]);
    const url = clusterUrl(current.selection);
    // Each value has its own SWR entry, so both have to be seeded or a consumer of either sits in loading.
    const fallback = clusterInfo
        ? {
              [unstable_serialize(['epoch-info', url])]: clusterInfo.epochInfo,
              [unstable_serialize(['epoch-schedule', url])]: clusterInfo.epochSchedule,
          }
        : {};
    return (
        <SWRConfig value={{ fallback }}>
            <StateContext.Provider value={current}>{children}</StateContext.Provider>
        </SWRConfig>
    );
}
