'use client';

import { BlockOverviewCard } from '@components/block/BlockOverviewCard';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { BlockProvider, FetchStatus, useBlock, useFetchBlock } from '@providers/block';
import { useCluster, useClusterInfo } from '@providers/cluster';
import { ClusterStatus } from '@utils/cluster';
import { notFound } from 'next/navigation';
import React, { PropsWithChildren, use } from 'react';

import { type NavigationTab, NavigationTabs } from '@/app/shared/ui/navigation-tabs';
import { PageHeader, PageLayout, PageSections } from '@/app/shared/ui/page-layout';
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
    const clusterInfo = useClusterInfo();
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
        const epoch = clusterInfo ? getEpochForSlot(clusterInfo.epochSchedule, BigInt(slotNumber)) : undefined;

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
        <PageLayout className="selection:bg-[#13d89b40] selection:text-inherit">
            <PageHeader eyebrow="Details" spacing="standalone" title="Block" />
            <PageSections>{content}</PageSections>
        </PageLayout>
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
            {/* Sticky, full-bleed tab bar with a shadow on stuck — the same wrapper the transaction page
                gets from `scrollSpy`, shared here via `sticky` so both pages pin and shadow identically. */}
            <NavigationTabs
                buildHref={buildHref}
                className="gap-5"
                sticky
                tabs={TABS}
                wrapperClassName="bg-heavy-metal-900"
            />
            {children}
        </>
    );
}
