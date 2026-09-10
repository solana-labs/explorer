'use client';

import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { fetchEpochInfo } from '../api/fetch-epoch-info';
import { fetchEpochSchedule } from '../api/fetch-epoch-schedule';
import { fetchFirstAvailableBlock } from '../api/fetch-first-available-block';
import { ClusterStatus } from '../lib/cluster';
import type { ClusterInfo, EpochInfo } from '../lib/types';
import { useCluster } from './use-cluster';

/** A cluster fetch as SWR reports it, so a consumer can tell "failed" from "not fetched yet". */
export type ClusterQueryResult<T> = {
    data: T | undefined;
    error: unknown;
    isLoading: boolean;
};

type Options = { enabled?: boolean };

/**
 * The epoch schedule, fixed at genesis. Needed wherever a slot has to be mapped to an epoch.
 *
 * Returns the value alone, which collapses "not connected", "in flight" and "failed" into `undefined`.
 * Use the `*Result` form where those must be told apart — a consumer that hides itself when the value
 * is absent otherwise hides itself silently on a fetch error.
 */
export function useEpochSchedule(options: Options = {}): ClusterInfo['epochSchedule'] | undefined {
    return useEpochScheduleResult(options).data;
}

export function useEpochScheduleResult(options: Options = {}): ClusterQueryResult<ClusterInfo['epochSchedule']> {
    return useClusterQuery('epoch-schedule', fetchEpochSchedule, options);
}

/** The live epoch. Moves every slot, so nothing that only needs slot→epoch should reach for it. */
export function useEpochInfo(options: Options = {}): EpochInfo | undefined {
    return useEpochInfoResult(options).data;
}

function useEpochInfoResult(options: Options = {}): ClusterQueryResult<EpochInfo> {
    return useClusterQuery('epoch-info', fetchEpochInfo, options);
}

/** The oldest block the endpoint still serves. Only the transaction-not-found card renders it. */
export function useFirstAvailableBlock(options: Options = {}): bigint | undefined {
    return useClusterQuery('first-available-block', fetchFirstAvailableBlock, options).data;
}

/** Both epoch values, for pages that render both. Shares each half's SWR entry, so it adds no request. */
export function useClusterInfo(options: Options = {}): ClusterInfo | undefined {
    const epochSchedule = useEpochSchedule(options);
    const epochInfo = useEpochInfo(options);

    return useMemo(
        () => (epochSchedule && epochInfo ? { epochInfo, epochSchedule } : undefined),
        [epochSchedule, epochInfo],
    );
}

/**
 * Fetches once the cluster is connected and a consumer actually mounts. SWR dedupes by key, so several
 * consumers of one value share a single request. Pass `enabled: false` to defer (e.g. the always-mounted
 * search bar only needs the epoch while a query is active).
 */
function useClusterQuery<T>(
    name: string,
    fetcher: (url: string) => Promise<T>,
    { enabled = true }: Options,
): ClusterQueryResult<T> {
    const { url, status } = useCluster();
    const shouldFetch = enabled && status === ClusterStatus.Connected && Boolean(url);
    const { data, error, isLoading } = useSWRImmutable(
        shouldFetch ? [name, url] : undefined,
        () => fetcher(url),
        // Capped so `error` settles. Each retry yields a fresh Error identity, which re-fires consumers
        // keyed on it — unbounded, that is one report per attempt for as long as the page stays open.
        { errorRetryCount: 3 },
    );

    return { data, error, isLoading: shouldFetch && isLoading };
}
