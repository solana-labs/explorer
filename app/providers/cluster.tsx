'use client';

// The cluster provider lives in the `cluster` FSD entity as a router-agnostic component. Binding it to
// Next.js navigation is app-layer work in FSD, and `app/providers/` currently serves as this repo's app
// layer — so that wiring lives here. This module also re-exports the rest of the entity's public API so
// the ~130 existing `@providers/cluster` import sites keep working unchanged.
import { ClusterProvider as ClusterStateProvider } from '@entities/cluster';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback } from 'react';

export function ClusterProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // `replace`, not `push`: this rewrite corrects the URL the app was given, it is not a place the user
    // asked to go. `push` would trap Back — it returns to the URL that still carries the param, which is
    // corrected and pushed again.
    //
    // The hash comes off the live location because `usePathname()` drops the fragment, and a corrective
    // rewrite must not discard a deep link's anchor. `window` needs no SSR guard: the only caller is an
    // effect in `useClusterUrl`, and effects never run on the server.
    const onReplaceSearchParams = useCallback(
        (next: URLSearchParams) => {
            const queryString = next.toString();
            const hash = window.location.hash;
            router.replace(`${pathname}${queryString ? `?${queryString}` : ''}${hash}`);
        },
        [pathname, router],
    );

    return (
        <ClusterStateProvider searchParams={searchParams} onReplaceSearchParams={onReplaceSearchParams}>
            {children}
        </ClusterStateProvider>
    );
}

export {
    type ClusterInfo,
    type ClusterState,
    clusterModalOpenAtom,
    customUrlEnabledAtom,
    getRpc,
    type SolanaRpc,
    StateContext,
    useCluster,
    useClusterConnectionFailed,
    useClusterInfo,
    type ClusterQueryResult,
    useClusterModal,
    useEpochInfo,
    useEpochSchedule,
    useEpochScheduleResult,
    useFirstAvailableBlock,
    useSolanaRpc,
} from '@entities/cluster';
