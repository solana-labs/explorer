'use client';

import { type ChainId, getChainId } from '@entities/chain-id/@x/token-info';
import { Cluster } from '@utils/cluster';
import { useMemo } from 'react';
import useSWR from 'swr';

import { fetchTokenInfos } from '../api/fetch-token-infos';
import type { TokenInfo } from '../lib/types';

const NO_TOKEN_INFOS: ReadonlyMap<string, TokenInfo> = new Map();

type UseTokenInfosResult = {
    isLoading: boolean;
    tokenInfos: ReadonlyMap<string, TokenInfo>;
};

/** Order-sensitive: the same mints in a different order are a separate entry. */
export function getTokenInfosSwrKey(mints: readonly string[], chainId: ChainId) {
    return ['token-infos', mints.join(','), chainId] as const;
}

/**
 * For callers that must know every mint before they can render anything. Use the
 * singular `useTokenInfo` for one mint.
 */
export function useTokenInfos(mints: readonly string[], cluster: Cluster, genesisHash?: string): UseTokenInfosResult {
    // The chain id, not the cluster and genesis hash it came from: the hash resolves a render late
    // and does not change the answer on the named clusters, so keying on it would refetch the whole
    // list for an identical result. Without a chain id nothing can resolve, so skip the request.
    const chainId = getChainId(cluster, genesisHash);
    const key = useMemo(
        () => (chainId && mints.length > 0 ? getTokenInfosSwrKey(mints, chainId) : undefined),
        [chainId, mints],
    );

    const { data, isLoading } = useSWR(
        key,
        () => fetchTokenInfos(mints, cluster, genesisHash),
        // Verified status changes on the scale of days.
        { revalidateOnFocus: false },
    );

    return { isLoading, tokenInfos: data ?? NO_TOKEN_INFOS };
}
