'use client';

import { TableCardBody } from '@components/common/TableCardBody';
import { StatsNotReady } from '@components/StatsNotReady';
import { ClusterStatsStatus, PERF_UPDATE_SEC, usePerformanceInfo } from '@providers/stats/solanaClusterStats';
import { PerformanceInfo } from '@providers/stats/solanaPerformanceInfo';
import { PingInfo, PingRollupInfo, PingStatus, useSolanaPingInfo } from '@providers/stats/SolanaPingProvider';
import { BarElement, CategoryScale, Chart, ChartData, ChartOptions, LinearScale, Tooltip } from 'chart.js';
import classNames from 'classnames';
import React from 'react';
import CountUp from 'react-countup';
import { RefreshCw } from 'react-feather';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

type Series = 'short' | 'medium' | 'long';
type SetSeries = (series: Series) => void;

export function LiveTransactionStatsCard() {
    const [series, setSeries] = React.useState<Series>('short');
    return (
        <div className="card">
            <div className="card-header">
                <h4 className="card-header-title">Live Transaction Stats</h4>
            </div>
            <TpsCardBody series={series} setSeries={setSeries} />
        </div>
    );
}


function AnimatedTransactionCount({ info }: { info: PerformanceInfo }) {
    const txCountRef = React.useRef(0);
    const countUpRef = React.useRef({ lastUpdate: 0, period: 0, start: 0 });
    const countUp = countUpRef.current;

    const { transactionCount, avgTps } = info;
    const txCount = Number(transactionCount);

    // Track last tx count to reset count up options
    if (txCount !== txCountRef.current) {
        if (countUp.lastUpdate > 0) {
            // Since we overshoot below, calculate the elapsed value
            // and start from there.
            const elapsed = Date.now() - countUp.lastUpdate;
            const elapsedPeriods = elapsed / (PERF_UPDATE_SEC * 1000);
            countUp.start = Math.floor(countUp.start + elapsedPeriods * countUp.period);

            // if counter gets ahead of actual count, just hold for a bit
            // until txCount catches up (this will sometimes happen when a tab is
            // sent to the background and/or connection drops)
            countUp.period = Math.max(txCount - countUp.start, 1);
        } else {
            // Since this is the first tx count value, estimate the previous
            // tx count in order to have a starting point for our animation
            countUp.period = PERF_UPDATE_SEC * avgTps;
            countUp.start = txCount - countUp.period;
        }
        countUp.lastUpdate = Date.now();
        txCountRef.current = txCount;
    }

    // Overshoot the target tx count in case the next update is delayed
    const COUNT_PERIODS = 3;
    const countUpEnd = countUp.start + COUNT_PERIODS * countUp.period;
    return (
        <CountUp
            start={countUp.start}
            end={countUpEnd}
            duration={PERF_UPDATE_SEC * COUNT_PERIODS}
            delay={0}
            useEasing={false}
            preserveValue={true}
            separator=","
        />
    );
}

function PingStatsCardBody({ series, setSeries }: { series: Series; setSeries: SetSeries }) {
    const pingInfo = useSolanaPingInfo();

    if (pingInfo.status !== PingStatus.Ready) {
        return <PingStatsNotReady error={pingInfo.status === PingStatus.Error} retry={pingInfo.retry} />;
    }

    return <PingBarChart pingInfo={pingInfo} series={series} setSeries={setSeries} />;
}

type StatsNotReadyProps = { error: boolean; retry?: () => void };
function PingStatsNotReady({ error, retry }: StatsNotReadyProps) {
    if (error) {
        return (
            <div className="card-body text-center">
                There was a problem loading solana ping stats.{' '}
                {retry && (
                    <button
                        className="btn btn-white btn-sm"
                        onClick={() => {
                            retry();
                        }}
                    >
                        <RefreshCw className="align-text-top me-2" size={13} />
                        Try Again
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="card-body text-center">
            <span className="align-text-top spinner-grow spinner-grow-sm me-2"></span>
            Loading
        </div>
    );
}


