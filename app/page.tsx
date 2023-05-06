'use client';

import { Epoch } from '@components/common/Epoch';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Slot } from '@components/common/Slot';
import { TableCardBody } from '@components/common/TableCardBody';
import { TimestampToggle } from '@components/common/TimestampToggle';
import { LiveTransactionStatsCard } from '@components/LiveTransactionStatsCard';
import { StatsNotReady } from '@components/StatsNotReady';
import { useVoteAccounts } from '@providers/accounts/vote-accounts';
import { useCluster } from '@providers/cluster';
import {
    ClusterStatsStatus,
    useDashboardInfo,
    usePerformanceInfo,
    useStatsProvider,
} from '@providers/stats/solanaClusterStats';
import { Status, useFetchSupply, useSupply } from '@providers/supply';
import { ClusterStatus } from '@utils/cluster';
import { CoingeckoStatus, useCoinGecko } from '@utils/coingecko';
import { displayTimestampWithoutDate } from '@utils/date';
import { abbreviatedNumber, lamportsToSol, slotsToHumanString } from '@utils/index';
import React from 'react';

export default function Page() {
    return (
        <div className="container mt-4">
            <StakingComponent />
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h4 className="card-header-title">Live Cluster Stats</h4>
                        </div>
                    </div>
                </div>
                <StatsCardBody />
            </div>
            <LiveTransactionStatsCard />
        </div>
    );
}

function StakingComponent() {
    const { status } = useCluster();
    const supply = useSupply();
    const fetchSupply = useFetchSupply();
    const coinInfo = useCoinGecko('solana');
    const { fetchVoteAccounts, voteAccounts } = useVoteAccounts();

    function fetchData() {
        fetchSupply();
        fetchVoteAccounts();
    }

    React.useEffect(() => {
        if (status === ClusterStatus.Connected) {
            fetchData();
        }
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

    const delinquentStake = React.useMemo(() => {
        if (voteAccounts) {
            return voteAccounts.delinquent.reduce((prev, current) => prev + current.activatedStake, 0);
        }
    }, [voteAccounts]);

    const activeStake = React.useMemo(() => {
        if (voteAccounts && delinquentStake) {
            return voteAccounts.current.reduce((prev, current) => prev + current.activatedStake, 0) + delinquentStake;
        }
    }, [voteAccounts, delinquentStake]);

    if (supply === Status.Disconnected) {
        // we'll return here to prevent flicker
        return null;
    }

    if (supply === Status.Idle || supply === Status.Connecting || !coinInfo) {
        return <LoadingCard message="Loading supply and price data" />;
    } else if (typeof supply === 'string') {
        return <ErrorCard text={supply} retry={fetchData} />;
    }

    const circulatingPercentage = ((supply.circulating / supply.total) * 100).toFixed(1);

    let delinquentStakePercentage;
    if (delinquentStake && activeStake) {
        delinquentStakePercentage = ((delinquentStake / activeStake) * 100).toFixed(1);
    }

    let solanaInfo;
    if (coinInfo.status === CoingeckoStatus.Success) {
        solanaInfo = coinInfo.coinInfo;
    }

    return (
        <div className="row staking-card">
            <div className="col-12 col-lg-4 col-xl">
                <div className="card">
                    <div className="card-body">
                        <h4>Circulating Supply</h4>
                        <h1>
                            <em>{displayLamports(supply.circulating)}</em> /{' '}
                            <small>{displayLamports(supply.total)}</small>
                        </h1>
                        <h5>
                            <em>{circulatingPercentage}%</em> is circulating
                        </h5>
                    </div>
                </div>
            </div>
            <div className="col-12 col-lg-4 col-xl">
                <div className="card">
                    <div className="card-body">
                        <h4>Active Stake</h4>
                        {activeStake && (
                            <h1>
                                <em>{displayLamports(activeStake)}</em> / <small>{displayLamports(supply.total)}</small>
                            </h1>
                        )}
                        {delinquentStakePercentage && (
                            <h5>
                                Delinquent stake: <em>{delinquentStakePercentage}%</em>
                            </h5>
                        )}
                    </div>
                </div>
            </div>
            <div className="col-12 col-lg-4 col-xl">
                <div className="card">
                    <div className="card-body">
                        {solanaInfo && (
                            <>
                                <h4>
                                    Price{' '}
                                    <span className="ms-2 badge bg-primary rank">
                                        Rank #{solanaInfo.market_cap_rank}
                                    </span>
                                </h4>
                                <h1>
                                    <em>${solanaInfo.price.toFixed(2)}</em>{' '}
                                    {solanaInfo.price_change_percentage_24h > 0 && (
                                        <small className="change-positive">
                                            &uarr; {solanaInfo.price_change_percentage_24h.toFixed(2)}%
                                        </small>
                                    )}
                                    {solanaInfo.price_change_percentage_24h < 0 && (
                                        <small className="change-negative">
                                            &darr; {solanaInfo.price_change_percentage_24h.toFixed(2)}%
                                        </small>
                                    )}
                                    {solanaInfo.price_change_percentage_24h === 0 && <small>0%</small>}
                                </h1>
                                <h5>
                                    24h Vol: <em>${abbreviatedNumber(solanaInfo.volume_24)}</em> MCap:{' '}
                                    <em>${abbreviatedNumber(solanaInfo.market_cap)}</em>
                                </h5>
                            </>
                        )}
                        {coinInfo.status === CoingeckoStatus.FetchFailed && (
                            <>
                                <h4>Price</h4>
                                <h1>
                                    <em>$--.--</em>
                                </h1>
                                <h5>Error fetching the latest price information</h5>
                            </>
                        )}
                        {solanaInfo && (
                            <p className="updated-time text-muted">
                                Updated at {displayTimestampWithoutDate(solanaInfo.last_updated.getTime())}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function displayLamports(value: number) {
    return abbreviatedNumber(lamportsToSol(value));
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

    const { avgSlotTime_1h, avgSlotTime_1min, epochInfo, blockTime } = dashboardInfo;
    const hourlySlotTime = Math.round(1000 * avgSlotTime_1h);
    const averageSlotTime = Math.round(1000 * avgSlotTime_1min);
    const { slotIndex, slotsInEpoch } = epochInfo;
    const epochProgress = ((100 * slotIndex) / slotsInEpoch).toFixed(1) + '%';
    const epochTimeRemaining = slotsToHumanString(slotsInEpoch - slotIndex, hourlySlotTime);
    const { blockHeight, absoluteSlot } = epochInfo;

    return (
        <TableCardBody>
            <tr>
                <td className="w-100">Slot</td>
                <td className="text-lg-end font-monospace">
                    <Slot slot={absoluteSlot} link />
                </td>
            </tr>
            {blockHeight !== undefined && (
                <tr>
                    <td className="w-100">Block height</td>
                    <td className="text-lg-end font-monospace">
                        <Slot slot={blockHeight} />
                    </td>
                </tr>
            )}
            {blockTime && (
                <tr>
                    <td className="w-100">Cluster time</td>
                    <td className="text-lg-end font-monospace">
                        <TimestampToggle unixTimestamp={blockTime}></TimestampToggle>
                    </td>
                </tr>
            )}
            <tr>
                <td className="w-100">Slot time (1min average)</td>
                <td className="text-lg-end font-monospace">{averageSlotTime}ms</td>
            </tr>
            <tr>
                <td className="w-100">Slot time (1hr average)</td>
                <td className="text-lg-end font-monospace">{hourlySlotTime}ms</td>
            </tr>
            <tr>
                <td className="w-100">Epoch</td>
                <td className="text-lg-end font-monospace">
                    <Epoch epoch={epochInfo.epoch} link />
                </td>
            </tr>
            <tr>
                <td className="w-100">Epoch progress</td>
                <td className="text-lg-end font-monospace">{epochProgress}</td>
            </tr>
            <tr>
                <td className="w-100">Epoch time remaining (approx.)</td>
                <td className="text-lg-end font-monospace">~{epochTimeRemaining}</td>
            </tr>
        </TableCardBody>
    );
}
