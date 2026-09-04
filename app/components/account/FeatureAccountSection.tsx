import { Address } from '@components/common/Address';
import { Slot } from '@components/common/Slot';
import { type FeatureInfoType, getFeatureInfo } from '@entities/feature-gate';
import { useSlotTime } from '@entities/slot-time';
import { AccountCard } from '@features/account';
import { Account } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import { parseFeatureAccount, useFeatureAccount } from '@utils/parseFeatureAccount';
import { useBuildClusterPath } from '@utils/url';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ExternalLink as ExternalLinkIcon } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { ClusterInfo, useCluster, useClusterInfo } from '@/app/providers/cluster';
import { BaseTable } from '@/app/shared/ui/Table';
import { Cluster, clusterName } from '@/app/utils/cluster';
import { getEpochForSlot } from '@/app/utils/epoch-schedule';

import { UnknownAccountCard } from './UnknownAccountCard';

export function FeatureAccountSection({ account }: { account: Account }) {
    const address = account.pubkey.toBase58();

    // Making decision about card rendering upon these factors:
    //  - assume that account could be parsed by its signs
    //  - address matches feature that is present at featureGates.json
    const { isFeature } = useFeatureAccount(account);
    const maybeFeatureInfo = useMemo(() => getFeatureInfo(address), [address]);

    return (
        <ErrorBoundary fallback={<UnknownAccountCard account={account} />}>
            {isFeature ? (
                // use account-specific card that able to parse account' data
                <FeatureCard account={account} />
            ) : (
                // feature that is preset at JSON would not have data about slot. leave it as null
                <BaseFeatureCard
                    account={account}
                    activatedAt={null}
                    address={address}
                    featureInfo={maybeFeatureInfo}
                />
            )}
        </ErrorBoundary>
    );
}

type Props = Readonly<{
    account: Account;
}>;

const FeatureCard = ({ account }: Props) => {
    const feature = parseFeatureAccount(account);
    const featureInfo = useMemo(() => getFeatureInfo(feature.address), [feature.address]);
    const isPending = feature.activatedAt === null;

    return (
        <BaseFeatureCard
            account={account}
            address={feature.address}
            activatedAt={feature.activatedAt}
            featureInfo={featureInfo}
            isPending={isPending}
        />
    );
};

const BaseFeatureCard = ({
    account,
    activatedAt,
    address,
    featureInfo,
    isPending = false,
}: ReturnType<typeof parseFeatureAccount> & {
    account: Account;
    featureInfo?: FeatureInfoType;
    isPending?: boolean;
}) => {
    const { cluster } = useCluster();
    const clusterInfo = useClusterInfo();

    let activatedAtSlot;
    let simdLink;
    if (activatedAt) {
        activatedAtSlot = (
            <BaseTable.Row>
                <BaseTable.Cell className="whitespace-nowrap">Activated At Slot</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <Slot slot={activatedAt} link />
                </BaseTable.Cell>
            </BaseTable.Row>
        );
    }
    if (featureInfo) {
        simdLink = (
            <BaseTable.Row>
                <BaseTable.Cell>SIMDs</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    {featureInfo.simds.map((simd, index) => (
                        <div key={index}>
                            {simd && featureInfo.simd_link[index] ? (
                                <ExternalLink href={featureInfo.simd_link[index]}>
                                    SIMD {simd} <ExternalLinkIcon className="align-text-top" size={13} />
                                </ExternalLink>
                            ) : (
                                <code>No link</code>
                            )}
                        </div>
                    ))}
                </BaseTable.Cell>
            </BaseTable.Row>
        );
    }

    return (
        <AccountCard title={featureInfo?.title ?? 'Feature Activation'} account={account} layout="expanded">
            <BaseTable.Row>
                <BaseTable.Cell>Address</BaseTable.Cell>
                <BaseTable.Cell>
                    <Address pubkey={new PublicKey(address)} alignRight raw />
                </BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell className="whitespace-nowrap">Activated?</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    {activatedAt !== null ? (
                        <Badge ui="dashkit" variant="success" tone="solid">
                            Active on {clusterName(cluster)}
                        </Badge>
                    ) : isPending ? (
                        <Badge ui="dashkit" variant="warning" tone="solid">
                            Pending activation on {clusterName(cluster)}
                        </Badge>
                    ) : (
                        <code>Not yet activated on {clusterName(cluster)}</code>
                    )}
                </BaseTable.Cell>
            </BaseTable.Row>

            {activatedAtSlot}

            <BaseTable.Row>
                <BaseTable.Cell className="whitespace-nowrap">Cluster Activation</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <ClusterActivationEpochAtCluster
                        cluster={cluster}
                        clusterInfo={clusterInfo}
                        activatedAt={activatedAt}
                        isPending={isPending}
                    />
                </BaseTable.Cell>
            </BaseTable.Row>

            {featureInfo?.description && (
                <BaseTable.Row>
                    <BaseTable.Cell>Description</BaseTable.Cell>
                    <BaseTable.Cell className="text-right">{featureInfo?.description}</BaseTable.Cell>
                </BaseTable.Row>
            )}

            {simdLink}
        </AccountCard>
    );
};

function formatCountdown(totalSeconds: number): string {
    if (totalSeconds <= 0) return 'any moment now';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (parts.length === 0 || seconds > 0) parts.push(`${seconds}s`);
    return `~${parts.join(' ')}`;
}

function EpochCountdown({ remainingSlots, msPerSlot }: { remainingSlots: bigint; msPerSlot: number }) {
    const estimatedSeconds = Math.ceil((Number(remainingSlots) * msPerSlot) / 1000);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        const target = Date.now() + estimatedSeconds * 1000;
        const tick = () => setSecondsLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [estimatedSeconds]);

    if (secondsLeft === null) return null;

    const label = formatCountdown(secondsLeft);

    return (
        <span className="text-dk-warning-on-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {secondsLeft > 0 ? `${label} remaining` : label}
        </span>
    );
}

/**
 * Owns the slot-time request, so it is made where the countdown is about to render. Only a pending
 * feature has one, and a custom cluster never gets this far — asking higher up would put a request on
 * every feature account page, and on a custom cluster it would reach the visitor's own node for nothing.
 */
function PendingEpochCountdown({ remainingSlots }: { remainingSlots: bigint }) {
    const msPerSlot = useSlotTime();
    if (msPerSlot === undefined) return null;

    return (
        <div className="mt-[3px]">
            <EpochCountdown remainingSlots={remainingSlots} msPerSlot={msPerSlot} />
        </div>
    );
}

function ClusterActivationEpochAtCluster({
    cluster,
    clusterInfo,
    activatedAt,
    isPending = false,
}: {
    cluster: Cluster;
    clusterInfo: ClusterInfo | undefined;
    activatedAt: number | null;
    isPending?: boolean;
}) {
    const buildClusterPath = useBuildClusterPath();

    if (cluster === Cluster.Custom) return null;

    if (activatedAt !== null && clusterInfo?.epochSchedule) {
        const epoch = getEpochForSlot(clusterInfo.epochSchedule, BigInt(activatedAt));
        return (
            <Link href={buildClusterPath(`/epoch/${epoch}`)}>
                {clusterName(cluster)} Epoch {epoch.toString()}
            </Link>
        );
    }

    if (isPending && clusterInfo?.epochInfo) {
        const nextEpoch = clusterInfo.epochInfo.epoch + 1n;
        const remainingSlots = clusterInfo.epochInfo.slotsInEpoch - clusterInfo.epochInfo.slotIndex;
        return (
            <div>
                <Link href={buildClusterPath(`/epoch/${nextEpoch}`)}>
                    {clusterName(cluster)} Epoch {nextEpoch.toString()}
                </Link>
                <PendingEpochCountdown remainingSlots={remainingSlots} />
            </div>
        );
    }

    return <code>No Activation Epoch</code>;
}
