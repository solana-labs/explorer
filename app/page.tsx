'use client';

import { Epoch } from '@components/common/Epoch';
import { Slot } from '@components/common/Slot';
import { TableCardBody } from '@components/common/TableCardBody';
import { TimestampToggle } from '@components/common/TimestampToggle';
import { LiveTransactionStatsCard } from '@components/LiveTransactionStatsCard';
import { StatsNotReady } from '@components/StatsNotReady';
import { UpcomingFeatures } from '@features/feature-gate';
import { useCluster } from '@providers/cluster';
import { StatsProvider } from '@providers/stats';
import {
    ClusterStatsStatus,
    useDashboardInfo,
    usePerformanceInfo,
    useStatsProvider,
} from '@providers/stats/solanaClusterStats';
import { slotsToHumanString } from '@utils/index';
import { percentage } from '@utils/math';
import React from 'react';

import { Card, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';

import { DeveloperResources } from './components/DeveloperResources';
import { StakingSection } from './components/StakingSection';

export default function Page() {
    return (
        <StatsProvider>
            <PageContainer className="mt-4">
                <StakingSection />

                <div className="flex flex-col lg:flex-row lg:gap-6">
                    <div className="w-full lg:w-1/2">
                        <StatsCardBody />
                    </div>
                    <div className="w-full lg:w-1/2">
                        <LiveTransactionStatsCard />
                    </div>
                </div>

                <DeveloperResources />

                <UpcomingFeatures />
            </PageContainer>
        </StatsProvider>
    );
}

function StatsCardBody() {
    const dashboardInfo = useDashboardInfo();
    const performanceInfo = usePerformanceInfo();
    const { setActive } = useStatsProvider();
    const { cluster } = useCluster();

    React.useEffect(() => {
        setActive(true);
        return () => setActive(false);
    }, [setActive, cluster]);

    if (performanceInfo.status !== ClusterStatsStatus.Ready || dashboardInfo.status !== ClusterStatsStatus.Ready) {
        const error =
            performanceInfo.status === ClusterStatsStatus.Error || dashboardInfo.status === ClusterStatsStatus.Error;
        return <StatsNotReady error={error} />;
    }

    const { msPerSlot_1h, msPerSlot_1min, epochInfo, blockTime } = dashboardInfo;
    const { slotIndex, slotsInEpoch } = epochInfo;
    const epochProgress = `${percentage(slotIndex, slotsInEpoch, 2).toFixed(1)}%`;
    const epochTimeRemaining = slotsToHumanString(Number(slotsInEpoch - slotIndex), msPerSlot_1h);
    const { blockHeight, absoluteSlot } = epochInfo;

    return (
        <Card ui="dashkit" flex="grow" className="mb-3 md:mb-6">
            <CardHeader ui="dashkit">
                <CardTitle as="h4" ui="dashkit">
                    Live Cluster Stats
                </CardTitle>
            </CardHeader>
            <TableCardBody layout="expanded" className="[&_td:first-child]:!w-2/5 md:[&_td:first-child]:!w-auto">
                <tr>
                    <td className="w-full">Slot</td>
                    <td className="text-right font-mono">
                        <Slot slot={absoluteSlot} link />
                    </td>
                </tr>
                {blockHeight !== undefined && (
                    <tr>
                        <td className="w-full">Block height</td>
                        <td className="text-right font-mono">
                            <Slot slot={blockHeight} />
                        </td>
                    </tr>
                )}
                {blockTime && (
                    <tr>
                        <td className="w-full">Cluster time</td>
                        <td className="text-right font-mono">
                            <TimestampToggle unixTimestamp={blockTime} shorter></TimestampToggle>
                        </td>
                    </tr>
                )}
                <tr>
                    <td className="w-full">Slot time (1min average)</td>
                    <td className="text-right font-mono">{msPerSlot_1min}ms</td>
                </tr>
                <tr>
                    <td className="w-full">Slot time (1hr average)</td>
                    <td className="text-right font-mono">{msPerSlot_1h}ms</td>
                </tr>
                <tr>
                    <td className="w-full">Epoch</td>
                    <td className="text-right font-mono">
                        <Epoch epoch={epochInfo.epoch} link />
                    </td>
                </tr>
                <tr>
                    <td className="w-full">Epoch progress</td>
                    <td className="text-right font-mono">{epochProgress}</td>
                </tr>
                <tr>
                    <td className="w-full">Epoch time remaining (approx.)</td>
                    <td className="text-right font-mono">~{epochTimeRemaining}</td>
                </tr>
            </TableCardBody>
        </Card>
    );
}
