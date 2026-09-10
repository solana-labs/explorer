import { useCluster, useEpochInfo } from '@providers/cluster';
import useSWR from 'swr';

import { Logger } from '@/app/shared/lib/logger';

import { parseNaturalNumber } from '../lib/parse-natural-number';
import type { SearchContext, SearchOptions, SearchProvider, SearchProviderRegistry } from '../lib/types';
import { searchProviders } from './registry';

export function useSearch(query: string) {
    const { cluster, genesisHash } = useCluster();
    const trimmed = query.trim();

    // currentEpoch only bounds numeric epoch-number searches (see epoch-search-provider), so fetch it
    // lazily and only for a numeric query: address/signature searches never pull cluster info, and the
    // search never re-runs when epoch info resolves. When disabled, currentEpoch stays undefined and
    // drops out of the SWR key below.
    const isNumericQuery = parseNaturalNumber(trimmed) !== undefined;
    const currentEpoch = useEpochInfo({ enabled: isNumericQuery })?.epoch;

    return useSWR(
        trimmed.length > 0 ? ['search', trimmed, cluster, genesisHash, currentEpoch?.toString()] : null,
        () =>
            search(searchProviders, trimmed, {
                cluster,
                currentEpoch,
                genesisHash,
            }),
        {
            keepPreviousData: false,
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );
}

/**
 * Run all provider tiers and merge results.
 *
 * Remote providers start concurrently with local providers since they are
 * independent. Fallback providers only run when local returns nothing.
 */
export async function search(
    registry: SearchProviderRegistry,
    query: string,
    ctx: SearchContext,
): Promise<SearchOptions[]> {
    const { local, fallback, remote } = registry;

    // Kick off remote immediately — it doesn't depend on local results
    const remotePromise = resolveProviders(remote, query, ctx);

    const localResults = await resolveProviders(local, query, ctx);

    // If no local results, fall back to fallback providers
    const fallbackResults = localResults.length === 0 ? await resolveProviders(fallback, query, ctx) : [];

    const remoteResults = await remotePromise;

    return [...localResults, ...fallbackResults, ...remoteResults];
}

export async function resolveProviders(
    providers: SearchProvider[],
    query: string,
    ctx: SearchContext,
): Promise<SearchOptions[]> {
    const settled = await Promise.allSettled(providers.map(async p => p.search(query, ctx)));
    return settled.flatMap((result, i) => {
        if (result.status === 'rejected') {
            Logger.error(new Error(`Failed to run ${providers[i].name} search provider`, { cause: result.reason }), {
                sentry: true,
            });
            return [];
        }
        return result.value;
    });
}
