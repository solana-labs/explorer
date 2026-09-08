import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { BarElement, CategoryScale, Chart, type ChartData, type ChartOptions, LinearScale, Tooltip } from 'chart.js';
import { useEffect, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';

import { Logger } from '@/app/shared/lib/logger';
import { baseCardVariants, CardBody } from '@/app/shared/ui/Card';

import { formatTooltipTitle, toInstructionCUDisplay } from '../lib/instruction-display';
import type { InstructionCUData } from '../lib/types';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

// Every mounted card shares one tooltip element, looked up by this id from four places: the Chart.js
// external handler that creates and fills it, and the scroll/unmount cleanup that hides and removes it.
const TOOLTIP_ELEMENT_ID = 'cu-chartjs-tooltip';

/**
 * The chart dataset, widened with the finished strings the tooltip renders. Chart.js carries these
 * through untouched; `toInstructionCUDisplay` is the only place that derives them, so the tooltip never
 * recomputes a CU figure the legend already worked out.
 */
type ExtendedBarDataset = ChartData<'bar'>['datasets'][number] & {
    // Chart.js types its own `label` as optional. Required here because `toInstructionCUDisplay` always
    // produces one, so the tooltip needs no empty-title branch.
    label: string;
    displayValue: string;
    isEstimate: boolean;
    programName?: string;
};

function getInstructionColor(index: number): string {
    const colors = ['#20D79B', '#19A97A', '#137C5A', '#0C503A', '#093A2A'];

    // Use % to cycle through colors if there are more instructions than colors
    return colors[index % colors.length];
}

function useCUTooltipCleanup() {
    useEffect(() => {
        const hideTooltip = () => {
            const tooltipEl = document.getElementById(TOOLTIP_ELEMENT_ID);
            if (tooltipEl) tooltipEl.style.opacity = '0';
        };
        window.addEventListener('scroll', hideTooltip, true);
        return () => {
            window.removeEventListener('scroll', hideTooltip, true);
            const tooltipEl = document.getElementById(TOOLTIP_ELEMENT_ID);
            if (tooltipEl) tooltipEl.remove();
        };
    }, []);
}

function useCUProfileChartOptions(totalCU: number): ChartOptions<'bar'> {
    const posRef = useRef({ x: 0, y: 0 });

    return useMemo<ChartOptions<'bar'>>(
        () => ({
            animation: false,
            indexAxis: 'y',
            interaction: {
                intersect: false,
                mode: 'point',
            },
            layout: {
                padding: 0,
            },
            maintainAspectRatio: false,
            onHover: (event, activeElements) => {
                const canvas = event.native?.target as HTMLElement;
                if (canvas) {
                    canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                }
                // Capture pointer position — supports both mouse and touch events
                if (event.native) {
                    const nativeEvent = event.native as MouseEvent | TouchEvent;
                    if ('touches' in nativeEvent && nativeEvent.touches.length > 0) {
                        posRef.current.x = nativeEvent.touches[0].clientX;
                        posRef.current.y = nativeEvent.touches[0].clientY;
                    } else {
                        posRef.current.x = (nativeEvent as MouseEvent).clientX;
                        posRef.current.y = (nativeEvent as MouseEvent).clientY;
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: false,
                    external(context) {
                        let tooltipEl = document.getElementById(TOOLTIP_ELEMENT_ID);

                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.id = TOOLTIP_ELEMENT_ID;
                            tooltipEl.innerHTML = '<div class="content"></div>';
                            document.body.appendChild(tooltipEl);
                        }

                        const tooltipModel = context.tooltip;
                        if (tooltipModel.opacity === 0) {
                            tooltipEl.style.opacity = '0';
                            return;
                        }

                        if (tooltipModel.body) {
                            const dataPoint = tooltipModel.dataPoints[0];
                            const color = dataPoint.dataset.backgroundColor;
                            const dataset = dataPoint.dataset as ExtendedBarDataset;

                            const cuText = dataset.isEstimate ? 'CU reserved' : 'CU consumed';
                            const title = formatTooltipTitle({
                                label: dataset.label,
                                programName: dataset.programName,
                            });

                            const tooltipContent = tooltipEl.querySelector('div');
                            if (!tooltipContent) {
                                // The content node is created with the tooltip element and never removed
                                // on its own, so a miss means something else owns this id. Returning
                                // without hiding would leave the previous instruction's figures on screen.
                                Logger.warn('[compute-unit] CU tooltip element is missing its content node', {
                                    id: TOOLTIP_ELEMENT_ID,
                                });
                                tooltipEl.style.opacity = '0';
                                return;
                            }

                            // An IDL-derived name has no length limit. `overflow-wrap: anywhere` on the
                            // title wraps it, and `max-width` on the outer div is what keeps the wrapped
                            // tooltip from stretching off-screen — neither works without the other.
                            tooltipContent.innerHTML = `
                                <div style="
                                    background: rgba(30, 30, 30, 0.95);
                                    backdrop-filter: blur(10px);
                                    border-radius: 8px;
                                    padding: 12px 16px;
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                                    min-width: 180px;
                                    max-width: min(320px, calc(100vw - 32px));
                                ">
                                    <div style="
                                        display: flex;
                                        align-items: flex-start;
                                        gap: 8px;
                                        margin-bottom: 6px;
                                    ">
                                        <div style="
                                            width: 12px;
                                            height: 12px;
                                            border-radius: 2px;
                                            background-color: ${color};
                                            flex-shrink: 0;
                                            margin-top: 3px;
                                        "></div>
                                        <div class="cu-tooltip-title" style="
                                            color: white;
                                            font-size: 14px;
                                            font-weight: 600;
                                            overflow-wrap: anywhere;
                                        "></div>
                                    </div>
                                    <div class="cu-tooltip-cu" style="
                                        color: rgba(255, 255, 255, 0.9);
                                        font-size: 13px;
                                        padding-left: 20px;
                                    "></div>
                                </div>
                            `;
                            // An instruction name can come from program-authored on-chain IDL metadata, so
                            // it is written as text. Interpolating it into the markup above would let an
                            // IDL author inject HTML into this page.
                            const titleEl = tooltipContent.querySelector('.cu-tooltip-title');
                            const cuEl = tooltipContent.querySelector('.cu-tooltip-cu');
                            if (!titleEl || !cuEl) {
                                // Unreachable unless the template above is edited to drop these class
                                // names. Kept so that edit degrades to a hidden tooltip rather than one
                                // showing the previous instruction's figures.
                                Logger.warn('[compute-unit] CU tooltip markup is missing its text nodes');
                                tooltipEl.style.opacity = '0';
                                return;
                            }
                            titleEl.textContent = title;
                            cuEl.textContent = `${dataset.displayValue} ${cuText}`;
                        }

                        // Use captured mouse position with edge detection
                        tooltipEl.style.opacity = '1';
                        tooltipEl.style.position = 'fixed';
                        tooltipEl.style.pointerEvents = 'none';
                        tooltipEl.style.transition = 'all 0.1s ease';
                        tooltipEl.style.zIndex = '9999';

                        const { width: tw = 180, height: th = 70 } = tooltipEl.getBoundingClientRect();
                        const gap = 10;
                        const left = Math.max(0, Math.min(window.innerWidth - tw, posRef.current.x - tw / 2));
                        const top =
                            posRef.current.y - th - gap < 0 ? posRef.current.y + gap : posRef.current.y - th - gap;

                        tooltipEl.style.left = `${left}px`;
                        tooltipEl.style.top = `${top}px`;
                        tooltipEl.style.transform = '';
                    },
                },
            },
            resizeDelay: 0,
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    max: totalCU,
                    stacked: true,
                    ticks: {
                        display: false,
                    },
                },
                y: {
                    grid: {
                        display: false,
                    },
                    stacked: true,
                    ticks: {
                        display: false,
                    },
                },
            },
        }),
        [totalCU],
    );
}

type BaseCUProfilingCardProps = {
    instructions: InstructionCUData[];
    unitsConsumed?: number;
    // When true, render only the chart + legend body — no card chrome, no built-in header — so a
    // caller can supply its own section header (e.g. the inspector's header-outside layout).
    headerless?: boolean;
};

export function BaseCUProfilingCard({ instructions, unitsConsumed, headerless = false }: BaseCUProfilingCardProps) {
    const instructionsWithDisplay = useMemo(() => toInstructionCUDisplay(instructions), [instructions]);

    const totalDisplayCU = useMemo(
        () => instructionsWithDisplay.reduce((sum, item) => sum + item.displayCU, 0),
        [instructionsWithDisplay],
    );

    useCUTooltipCleanup();

    const chartOptions = useCUProfileChartOptions(totalDisplayCU);

    const chartData: ChartData<'bar'> = useMemo(
        () => ({
            // Annotated so the extra fields the tooltip reads are checked here, at the one place that
            // writes them — a plain object literal would pass them through untyped.
            datasets: instructionsWithDisplay.map<ExtendedBarDataset>((item, i) => ({
                backgroundColor: getInstructionColor(i),
                barThickness: 24,
                // Apply border radius only to the outer edges of the stacked bar
                // round left corners, round right corners
                borderRadius: {
                    bottomLeft: i === 0 ? 4 : 0,
                    bottomRight: i === instructionsWithDisplay.length - 1 ? 4 : 0,
                    topLeft: i === 0 ? 4 : 0,
                    topRight: i === instructionsWithDisplay.length - 1 ? 4 : 0,
                },
                borderSkipped: false,
                borderWidth: 0,
                data: [item.displayCU],
                displayValue: item.displayValue,
                hoverBackgroundColor: getInstructionColor(i),
                isEstimate: item.isEstimate,
                label: item.label,
                programName: item.programName,
            })),
            labels: [''],
        }),
        [instructionsWithDisplay],
    );

    if (instructions.length === 0) return undefined;

    const body = (
        <CardBody ui="dashkit" className={headerless ? 'px-3 py-3' : undefined}>
            {Boolean(unitsConsumed) && <div className="mb-3">Total: {unitsConsumed?.toLocaleString()} CU</div>}

            <div style={{ height: '32px', marginLeft: '-8px' }}>
                <Bar data={chartData} options={chartOptions} />
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {instructionsWithDisplay.map((item, i) => {
                    return (
                        // min-w-0 lets a long resolved name truncate instead of overflowing the card.
                        <div key={i} className="align-items-center flex min-w-0">
                            <div
                                style={{
                                    backgroundColor: getInstructionColor(i),
                                    borderRadius: '4px',
                                    flexShrink: 0,
                                    height: '16px',
                                    marginRight: '8px',
                                    width: '16px',
                                }}
                            />
                            <span className="truncate" title={`${item.legendLabel}: ${item.displayValue}`}>
                                {item.legendLabel}: {item.displayValue}
                            </span>
                        </div>
                    );
                })}
            </div>
        </CardBody>
    );

    if (headerless) return body;

    return (
        <CollapsibleCard title="CU profiling" className={baseCardVariants({ ui: 'dashkit' })}>
            {body}
        </CollapsibleCard>
    );
}
