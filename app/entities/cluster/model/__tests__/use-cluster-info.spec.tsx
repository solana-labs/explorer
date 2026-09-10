import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@solana/kit', () => ({ createSolanaRpc: vi.fn() }));

import { createSolanaRpc } from '@solana/kit';

import { Cluster, clusterSelection, ClusterStatus, clusterUrl } from '../../lib/cluster';
import { toConnectableUrl } from '../../lib/connectable-url';
import { type ClusterState, StateContext } from '../cluster-provider';
import { useClusterInfo, useEpochInfo, useEpochSchedule, useFirstAvailableBlock } from '../use-cluster-info';

const EPOCH_INFO = { absoluteSlot: 100n, blockHeight: 90n, epoch: 5n, slotIndex: 10n, slotsInEpoch: 432_000n };
const EPOCH_SCHEDULE = {
    firstNormalEpoch: 0n,
    firstNormalSlot: 0n,
    leaderScheduleSlotOffset: 432_000n,
    slotsPerEpoch: 432_000n,
    warmup: false,
};
const FIRST_BLOCK = 42n;
const EXPECTED_INFO = { epochInfo: EPOCH_INFO, epochSchedule: EPOCH_SCHEDULE };

function mockRpc() {
    return {
        getEpochInfo: vi.fn().mockReturnValue({ send: () => Promise.resolve(EPOCH_INFO) }),
        getEpochSchedule: vi.fn().mockReturnValue({ send: () => Promise.resolve(EPOCH_SCHEDULE) }),
        getFirstAvailableBlock: vi.fn().mockReturnValue({ send: () => Promise.resolve(FIRST_BLOCK) }),
        getGenesisHash: vi.fn().mockReturnValue({ send: () => Promise.resolve('hash') }),
    };
}

let rpc: ReturnType<typeof mockRpc>;

const connectedSelection = clusterSelection(Cluster.MainnetBeta);

const connectedState: ClusterState = {
    connectableUrl: toConnectableUrl(clusterUrl(connectedSelection)),
    selection: connectedSelection,
    status: ClusterStatus.Connected,
};

function makeWrapper(state: ClusterState) {
    return function Wrapper({ children }: { children: ReactNode }) {
        // Fresh cache per render so SWR entries don't leak across tests.
        return createElement(
            SWRConfig,
            { value: { dedupingInterval: 0, provider: () => new Map() } },
            createElement(StateContext.Provider, { value: state }, children),
        );
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    rpc = mockRpc();
    vi.mocked(createSolanaRpc).mockReturnValue(rpc as unknown as ReturnType<typeof createSolanaRpc>);
});

describe('useEpochSchedule', () => {
    it('should fetch only the schedule', async () => {
        const { result } = renderHook(() => useEpochSchedule(), { wrapper: makeWrapper(connectedState) });

        await waitFor(() => expect(result.current).toEqual(EPOCH_SCHEDULE));
        expect(rpc.getEpochSchedule).toHaveBeenCalledTimes(1);
        // The schedule is all a slot-to-epoch mapping needs; the live epoch and the oldest served block
        // used to ride along on the same fetch and were paid for on every page that mapped a slot.
        expect(rpc.getEpochInfo).not.toHaveBeenCalled();
        expect(rpc.getFirstAvailableBlock).not.toHaveBeenCalled();
        // getGenesisHash is the connection health check's job, not this hook's.
        expect(rpc.getGenesisHash).not.toHaveBeenCalled();
    });

    it('should not fetch until the cluster is connected', () => {
        const { result } = renderHook(() => useEpochSchedule(), {
            wrapper: makeWrapper({ ...connectedState, status: ClusterStatus.Connecting }),
        });

        expect(result.current).toBeUndefined();
        expect(createSolanaRpc).not.toHaveBeenCalled();
    });

    it('should not fetch when disabled', () => {
        const { result } = renderHook(() => useEpochSchedule({ enabled: false }), {
            wrapper: makeWrapper(connectedState),
        });

        expect(result.current).toBeUndefined();
        expect(createSolanaRpc).not.toHaveBeenCalled();
    });
});

describe('useEpochInfo', () => {
    it('should fetch only the live epoch', async () => {
        const { result } = renderHook(() => useEpochInfo(), { wrapper: makeWrapper(connectedState) });

        await waitFor(() => expect(result.current).toEqual(EPOCH_INFO));
        expect(rpc.getEpochInfo).toHaveBeenCalledTimes(1);
        expect(rpc.getEpochSchedule).not.toHaveBeenCalled();
        expect(rpc.getFirstAvailableBlock).not.toHaveBeenCalled();
    });

    it('should not fetch when disabled', () => {
        const { result } = renderHook(() => useEpochInfo({ enabled: false }), {
            wrapper: makeWrapper(connectedState),
        });

        expect(result.current).toBeUndefined();
        expect(createSolanaRpc).not.toHaveBeenCalled();
    });
});

describe('useFirstAvailableBlock', () => {
    it('should fetch only the oldest served block', async () => {
        const { result } = renderHook(() => useFirstAvailableBlock(), { wrapper: makeWrapper(connectedState) });

        await waitFor(() => expect(result.current).toEqual(FIRST_BLOCK));
        expect(rpc.getFirstAvailableBlock).toHaveBeenCalledTimes(1);
        expect(rpc.getEpochSchedule).not.toHaveBeenCalled();
        expect(rpc.getEpochInfo).not.toHaveBeenCalled();
    });

    it('should not fetch when disabled', () => {
        const { result } = renderHook(() => useFirstAvailableBlock({ enabled: false }), {
            wrapper: makeWrapper(connectedState),
        });

        expect(result.current).toBeUndefined();
        expect(createSolanaRpc).not.toHaveBeenCalled();
    });
});

describe('useClusterInfo', () => {
    it('should compose both epoch values without asking for the oldest served block', async () => {
        const { result } = renderHook(() => useClusterInfo(), { wrapper: makeWrapper(connectedState) });

        await waitFor(() => expect(result.current).toEqual(EXPECTED_INFO));
        expect(rpc.getEpochSchedule).toHaveBeenCalledTimes(1);
        expect(rpc.getEpochInfo).toHaveBeenCalledTimes(1);
        expect(rpc.getFirstAvailableBlock).not.toHaveBeenCalled();
    });

    it('should stay undefined until both halves arrive', async () => {
        rpc.getEpochInfo.mockReturnValue({ send: () => new Promise(() => {}) });

        const { result } = renderHook(() => useClusterInfo(), { wrapper: makeWrapper(connectedState) });

        await waitFor(() => expect(rpc.getEpochSchedule).toHaveBeenCalledTimes(1));
        expect(result.current).toBeUndefined();
    });

    it('should not fetch until the cluster is connected', () => {
        const { result } = renderHook(() => useClusterInfo(), {
            wrapper: makeWrapper({ ...connectedState, status: ClusterStatus.Connecting }),
        });

        expect(result.current).toBeUndefined();
        expect(createSolanaRpc).not.toHaveBeenCalled();
    });
});
