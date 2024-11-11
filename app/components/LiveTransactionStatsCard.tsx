'use client';

import { TableCardBody } from '@components/common/TableCardBody';
import { StatsNotReady } from '@components/StatsNotReady';
import { ClusterStatsStatus, PERF_UPDATE_SEC, usePerformanceInfo } from '@providers/stats/solanaClusterStats';
import { PerformanceInfo } from '@providers/stats/solanaPerformanceInfo';
import { PingInfo, PingRollupInfo, PingStatus, useSolanaPingInfo } from '@providers/stats/SolanaPingProvider';
import { BarElement, CategoryScale, Chart, ChartData, ChartOptions, LinearScale, Tooltip } from 'chart.js';
import classNames from 'classnames';
import React from 'react';
import { Bar } from 'react-chartjs-2';
import CountUp from 'react-countup';
import { RefreshCw } from 'react-feather';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

type Series = 'short' | 'medium' | 'long';
type SetSeries = (series: Series) => void;
const SERIES: Series[] = ['short', 'medium', 'long'];
const SERIES_INFO = {
    long: {
        interval: '6h',
        label: (index: number) => index * 12,
    },
    medium: {
        interval: '2h',
        label: (index: number) => index * 4,
    },
    short: {
        interval: '30m',
        label: (index: number) => index,
    },
};

export function LiveTransactionStatsCard() {
    const [series, setSeries] = React.useState<Series>('short');
    return (
        <div className="card">
            <div className="card-header">
                <h4 className="card-header-title">Live Transaction Stats</h4>
            </div>
            <TpsCardBody series={series} setSeries={setSeries} />
            <PingStatsCardBody series={series} setSeries={setSeries} />
        </div>
    );
}

function TpsCardBody({ series, setSeries }: { series: Series; setSeries: SetSeries }) {
    const performanceInfo = usePerformanceInfo();

    if (performanceInfo.status !== ClusterStatsStatus.Ready) {
        return <StatsNotReady error={performanceInfo.status === ClusterStatsStatus.Error} />;
    }

    return <TpsBarChart performanceInfo={performanceInfo} series={series} setSeries={setSeries} />;
}

const TPS_CHART_OPTIONS = (historyMaxTps: number): ChartOptions<'bar'> => {
    return {
        animation: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            tooltip: {
                enabled: false, // Disable the on-canvas tooltip
                external(context) {
                    // Tooltip Element
                    let tooltipEl = document.getElementById('chartjs-tooltip');

                    // Create element on first render
                    if (!tooltipEl) {
                        tooltipEl = document.createElement('div');
                        tooltipEl.id = 'chartjs-tooltip';
                        tooltipEl.innerHTML = '<div class="content"></div>';
                        document.body.appendChild(tooltipEl);
                    }

                    // Hide if no tooltip
                    const tooltipModel = context.tooltip;
                    if (tooltipModel.opacity === 0) {
                        tooltipEl.style.opacity = '0';
                        return;
                    }

                    // Set caret Position
                    tooltipEl.classList.remove('above', 'below', 'no-transform');
                    if (tooltipModel.yAlign) {
                        tooltipEl.classList.add(tooltipModel.yAlign);
                    } else {
                        tooltipEl.classList.add('no-transform');
                    }

                    // Set Text
                    if (tooltipModel.body) {
                        const { label, raw } = tooltipModel.dataPoints[0];
                        const tooltipContent = tooltipEl.querySelector('div');
                        if (tooltipContent) {
                            let innerHtml = `<div class="value">${raw} TPS</div>`;
                            innerHtml += `<div class="label">${label}</div>`;
                            tooltipContent.innerHTML = innerHtml;
                        }
                    }

                    const position = context.chart.canvas.getBoundingClientRect();

                    // Display, position, and set styles for font
                    tooltipEl.style.opacity = '1';
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                    tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                    tooltipEl.style.pointerEvents = 'none';
                },
                intersect: false,
            },
        },
        resizeDelay: 0,
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    display: false,
                },
            },
            y: {
                grid: {
                    display: false,
                },
                min: 0,
                suggestedMax: historyMaxTps,
                ticks: {
                    count: 10,
                    display: true,
                    font: {
                        size: 10,
                    },
                    precision: 0,
                    stepSize: 500,
                    textStrokeColor: '#EEE',
                },
            },
        },
    };
};

type TpsBarChartProps = {
    performanceInfo: PerformanceInfo;
    series: Series;
    setSeries: SetSeries;
};
function TpsBarChart({ performanceInfo, series, setSeries }: TpsBarChartProps) {
    const { perfHistory, avgTps, historyMaxTps } = performanceInfo;
    const averageTps = Math.round(avgTps).toLocaleString('en-US');
    const transactionCount = <AnimatedTransactionCount info={performanceInfo} />;
    const seriesData = perfHistory[series];
    const chartOptions = React.useMemo<ChartOptions<'bar'>>(() => TPS_CHART_OPTIONS(historyMaxTps), [historyMaxTps]);

    const seriesLength = seriesData.length;
    const chartData: ChartData<'bar'> = {
        datasets: [
            {
                backgroundColor: '#00D192',
                borderWidth: 0,
                data: seriesData.map(val => val || 0),
                hoverBackgroundColor: '#00D192',
            },
        ],
        labels: seriesData.map((val, i) => {
            return `${SERIES_INFO[series].label(seriesLength - i)}min ago`;
        }),
    };

    return (
        <>
            <TableCardBody>
                <tr>
                    <td className="w-100">Transaction count</td>
                    <td className="text-lg-end font-monospace">{transactionCount} </td>
                </tr>
                <tr>
                    <td className="w-100">Transactions per second (TPS)</td>
                    <td className="text-lg-end font-monospace">{averageTps} </td>
                </tr>
            </TableCardBody>

            <hr className="my-0" />

            <div className="card-body py-3">
                <div className="align-box-row align-items-start justify-content-between">
                    <div className="d-flex justify-content-between w-100">
                        <span className="mb-0 font-size-sm">TPS history</span>

                        <div className="font-size-sm">
                            {SERIES.map(key => (
                                <button
                                    key={key}
                                    onClick={() => setSeries(key)}
                                    className={classNames('btn btn-sm btn-white ms-2', {
                                        active: series === key,
                                    })}
                                >
                                    {SERIES_INFO[key].interval}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div id="perf-history" className="mt-3 d-flex justify-content-end flex-row w-100">
                        <div className="w-100">
                            <Bar data={chartData} options={chartOptions} height={80} />
                        </div>
                    </div>
                </div>
            </div>
        </>
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

const PING_CHART_OPTIONS: ChartOptions<'bar'> = {
    animation: false,
    interaction: {
        intersect: false,
        mode: 'index',
    },
    plugins: {
        tooltip: {
            enabled: false, // Disable the on-canvas tooltip
            external(context) {
                // Tooltip Element
                let tooltipEl = document.getElementById('chartjs-tooltip');

                // Create element on first render
                if (!tooltipEl) {
                    tooltipEl = document.createElement('div');
                    tooltipEl.id = 'chartjs-tooltip';
                    tooltipEl.innerHTML = '<div class="content"></div>';
                    document.body.appendChild(tooltipEl);
                }

                // Hide if no tooltip
                const tooltipModel = context.tooltip;
                if (tooltipModel.opacity === 0) {
                    tooltipEl.style.opacity = '0';
                    return;
                }

                // Set caret Position
                tooltipEl.classList.remove('above', 'below', 'no-transform');
                if (tooltipModel.yAlign) {
                    tooltipEl.classList.add(tooltipModel.yAlign);
                } else {
                    tooltipEl.classList.add('no-transform');
                }

                // Set Text
                if (tooltipModel.body) {
                    const { label } = tooltipModel.dataPoints[0];
                    const tooltipContent = tooltipEl.querySelector('div');
                    if (tooltipContent) {
                        tooltipContent.innerHTML = `${label}`;
                    }
                }

                const position = context.chart.canvas.getBoundingClientRect();

                // Display, position, and set styles for font
                tooltipEl.style.opacity = '1';
                tooltipEl.style.position = 'absolute';
                tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                tooltipEl.style.pointerEvents = 'none';
            },
            intersect: false,
        },
    },
    resizeDelay: 0,
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                display: false,
            },
        },
        y: {
            grid: {
                display: false,
            },
            min: 0,
            ticks: {
                display: true,
                font: {
                    size: 10,
                },
                stepSize: 100,
                textStrokeColor: '#EEE',
            },
        },
    },
};

function PingBarChart({
    pingInfo,
    series,
    setSeries,
}: {
    pingInfo: PingRollupInfo;
    series: Series;
    setSeries: SetSeries;
}) {
    const seriesData = pingInfo[series] || [];
    const maxMean = seriesData.reduce((a, b) => {
        return Math.max(a, b.mean);
    }, 0);
    const seriesLength = seriesData.length;
    const backgroundColor = (val: PingInfo) => {
        if (val.submitted === 0) {
            return '#08a274';
        }

        if (val.loss >= 0.25 && val.loss <= 0.5) {
            return '#FFA500';
        }

        return val.loss > 0.5 ? '#f00' : '#00D192';
    };
    const chartData: ChartData<'bar'> = {
        datasets: [
            {
                backgroundColor: seriesData.map(backgroundColor),
                borderWidth: 0,
                data: seriesData.map(val => {
                    if (val.submitted === 0) {
                        return maxMean * 0.5;
                    }
                    return val.mean || 0;
                }),
                hoverBackgroundColor: seriesData.map(backgroundColor),
                minBarLength: 2,
            },
        ],
        labels: seriesData.map((val, i) => {
            if (val.submitted === 0) {
                return `
            <div class="label">
              <p class="mb-0">Ping statistics unavailable</p>
              ${SERIES_INFO[series].label(seriesLength - i)}min ago
            </div>
            `;
            }

            return `
            <div class="value">${val.mean} ms</div>
            <div class="label">
              <p class="mb-0">${val.confirmed} of ${val.submitted} confirmed</p>
            ${
                val.loss
                    ? `<p class="mb-0">${val.loss.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          style: 'percent',
                      })} loss</p>`
                    : ''
            }
            ${SERIES_INFO[series].label(seriesLength - i)}min ago
            </div>
          `;
        }),
    };

    return (
        <div className="card-body py-3">
            <div className="align-box-row align-items-start justify-content-between">
                <div className="d-flex justify-content-between w-100">
                    <span className="mb-0 font-size-sm">Average Ping Time</span>

                    <div className="font-size-sm">
                        {SERIES.map(key => (
                            <button
                                key={key}
                                onClick={() => setSeries(key)}
                                className={classNames('btn btn-sm btn-white ms-2', {
                                    active: series === key,
                                })}
                            >
                                {SERIES_INFO[key].interval}
                            </button>
                        ))}
                    </div>
                </div>

                <div id="perf-history" className="mt-3 d-flex justify-content-end flex-row w-100">
                    <div className="w-100">
                        <Bar data={chartData} options={PING_CHART_OPTIONS} height={80} />
                    </div>
                </div>
            </div>
        </div>
    );
}
