import { useCluster } from '@providers/cluster';
import { Cluster, clusterSlug } from '@utils/cluster';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { useBuildClusterPath } from '@/app/utils/url';

import type { SearchItem } from '../lib/types';

export function useSearchNavigation(): (option: SearchItem) => void {
    const router = useRouter();
    const { cluster } = useCluster();
    const searchParams = useSearchParams();
    const buildClusterPath = useBuildClusterPath();

    return useCallback(
        (option: SearchItem) => {
            const { pathname } = option;
            const effectiveCluster = option.cluster ?? cluster;

            if (pathname.includes('?')) {
                const qIndex = pathname.indexOf('?');
                const path = pathname.slice(0, qIndex);
                const currentSearchParamsString = pathname.slice(qIndex + 1);
                const nextPath = buildClusterPath(path, {
                    additionalParams: new URLSearchParams(`cluster=${clusterSlug(effectiveCluster)}`),
                    // Not the URL bar's params — the target item carries its own query string.
                    currentSearchParams: new URLSearchParams(currentSearchParamsString),
                });
                router.push(nextPath);
            } else if (option.cluster !== undefined) {
                // Item carries its own cluster — use it instead of inheriting from the URL bar.
                if (effectiveCluster === Cluster.MainnetBeta) {
                    router.push(pathname);
                } else {
                    router.push(`${pathname}?cluster=${clusterSlug(effectiveCluster)}`);
                }
            } else {
                const nextSearchParams = new URLSearchParams(searchParams?.toString());
                nextSearchParams.delete('q');
                const nextQueryString = nextSearchParams.toString();
                router.push(`${pathname}${nextQueryString ? `?${nextQueryString}` : ''}`);
            }
        },
        [buildClusterPath, cluster, router, searchParams],
    );
}
