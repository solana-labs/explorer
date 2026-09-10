'use client';

import { BlockOverviewCard } from '@components/block/BlockOverviewCard';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { BlockProvider, FetchStatus, useBlock, useFetchBlock } from '@providers/block';
import { useCluster, useEpochSchedule } from '@providers/cluster';
import { ClusterStatus } from '@utils/cluster';
import { notFound } from 'next/navigation';
import React, { PropsWithChildren, use } from 'react';

import { type NavigationTab, NavigationTabs } from '@/app/shared/ui/navigation-tabs';
import { getEpochForSlot } from '@/app/utils/epoch-schedule';
import { useBuildClusterPath } from '@/app/utils/url';

type SlotParams = { slot: string };
type Props = PropsWithChildren<{ params: Promise<SlotParams> }>;
type InnerProps = PropsWithChildren<{ params: SlotParams }>;

function BlockLayoutInner({ children, params: { slot } }: InnerProps) {
    const slotNumber = Number(slot);
    if (isNaN(slotNumber) || slotNumber >= Number.MAX_SAFE_INTEGER || slotNumber % 1 !== 0) {
        notFound();
    }
    const confirmedBlock = useBlock(slotNumber);
    const fetchBlock = useFetchBlock();
    const { status } = useCluster();
    const epochSchedule = useEpochSchedule();
    const refresh = () => fetchBlock(slotNumber);

    // Fetch block on load
    React.useEffect(() => {
        if (!confirmedBlock && status === ClusterStatus.Connected) refresh();
    }, [slotNumber, status]); // eslint-disable-line react-hooks/exhaustive-deps

    let content;
    if (!confirmedBlock || confirmedBlock.status === FetchStatus.Fetching) {
        content = <LoadingCard message="Loading block" />;
    } else if (confirmedBlock.data === undefined || confirmedBlock.status === FetchStatus.FetchFailed) {
        content = <ErrorCard retry={refresh} text="Failed to fetch block" />;
    } else if (confirmedBlock.data.block === undefined) {
        content = <ErrorCard retry={refresh} text={`Block ${slotNumber} was not found`} />;
    } else {
        const { block, blockLeader, childSlot, childLeader, parentLeader } = confirmedBlock.data;
        const epoch = epochSchedule ? getEpochForSlot(epochSchedule, BigInt(slotNumber)) : undefined;

        content = (
            <>
                <BlockOverviewCard
                    block={block}
                    slot={slotNumber}
                    epoch={epoch}
                    blockLeader={blockLeader}
                    childSlot={childSlot}
                    childLeader={childLeader}
                    parentLeader={parentLeader}
                    // Tighten the mobile gap down to the tab bar. `!` overrides the `space-y-9`
                    // margin-bottom:0 set on non-first children; reset at `lg`.
                    className="!-mb-6 lg:!mb-0"
                />
                <MoreSection slot={slotNumber}>{children}</MoreSection>
            </>
        );
    }
    return (
        // Translucent-green text-selection highlight, matched exactly to the transaction page
        // (app/tx/[signature]/page-client.tsx). `#13d89b` is a one-off selection colour (not a token),
        // and `40` is its alpha (25%), kept as a literal so both pages stay visually in step.
        <div className="mx-auto flex max-w-5xl flex-col px-4 pt-3 selection:bg-[#13d89b40] selection:text-inherit lg:px-6 lg:pt-5">
            <header className="mb-3 flex flex-col gap-1.5 py-6">
                <span className="text-xs font-normal uppercase text-muted">Details</span>
                <h1 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">Block</h1>
            </header>
            {/* Section rhythm lives on this inner wrapper so the header sits outside the `space-y` and its
                own `mb-3` controls the gap to the first section — mirroring the inspector page. */}
            <div className="flex flex-col space-y-9 lg:space-y-12">{content}</div>
        </div>
    );
}

export default function BlockLayout(props: Props) {
    const params = use(props.params);

    const { children } = props;

    return (
        <BlockProvider>
            <BlockLayoutInner params={params}>{children}</BlockLayoutInner>
        </BlockProvider>
    );
}

const TABS: NavigationTab[] = [
    { path: '', title: 'Transactions' },
    { path: 'rewards', title: 'Rewards' },
    { path: 'programs', title: 'Programs' },
    { path: 'accounts', title: 'Accounts' },
];

function MoreSection({ children, slot }: { children: React.ReactNode; slot: number }) {
    const buildClusterPath = useBuildClusterPath();
    const buildHref = React.useCallback(
        (path: string) => buildClusterPath(`/block/${slot}/${path}`),
        [buildClusterPath, slot],
    );

    return (
        <>
            {/* Full-bleed sticky tab bar, mirroring the transaction page: the negative margins stretch the
                background edge-to-edge while the matching padding pulls the tabs back onto the content column. */}
            <div className="sticky top-0 z-10 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] overflow-x-auto bg-heavy-metal-900 pl-[calc(50vw-50%)] pr-[calc(50vw-50%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <NavigationTabs buildHref={buildHref} tabs={TABS} className="gap-5" />
            </div>
            {children}
        </>
    );
}
