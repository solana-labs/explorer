'use client';

import { useCluster } from '@providers/cluster';
import { useStatsProvider } from '@providers/stats/solanaClusterStats';
import { Cluster } from '@utils/cluster';
import { fetch } from 'cross-fetch';
import React from 'react';
import useTabVisibility from 'use-tab-visibility';

import { ValidatorsAppPingStats } from '@/app/api/ping/[network]/route';

const PING_INTERVALS: number[] = [1, 3, 12];

const FETCH_PING_INTERVAL = 60 * 1000;

function getClusterSlug(cluster: Cluster) {
    switch (cluster) {
        case Cluster.MainnetBeta:
            return 'mainnet';
        case Cluster.Devnet:
            return 'devnet';
        default:
            throw new Error(`Invalid cluster: ${cluster}`);
    }
}

function getUrl(cluster: Cluster) {
    return `/api/ping/${getClusterSlug(cluster)}`;
}

export enum PingStatus {
    Loading,
    Ready,
    Error,
}

export type ValidatorsAppPingStatsInfo = {
    status: PingStatus;
    short?: ValidatorsAppPingStatsRecord[];
    medium?: ValidatorsAppPingStatsRecord[];
    long?: ValidatorsAppPingStatsRecord[];
    retry?: () => void;
};

export type ValidatorsAppPingStatsRecord = {
    tps: number;
    median: number;
    submitted: number;
    average_slot_latency: number;
    timestamp: Date;
};

const ValidatorsAppStatsContext = React.createContext<ValidatorsAppPingStatsInfo | undefined>(undefined);

type Props = { children: React.ReactNode };

export function ValidatorsAppStatsProvider({ children }: Props) {
    const { cluster } = useCluster();
    const { active } = useStatsProvider();
    const [rollup, setRollup] = React.useState<ValidatorsAppPingStatsInfo | undefined>({
        status: PingStatus.Loading,
    });
    const { visible: isTabVisible } = useTabVisibility();
    React.useEffect(() => {
        if (!active || !isTabVisible) {
            return;
        }

        if (cluster === Cluster.Testnet || cluster === Cluster.Custom) {
            return;
        }

        const url = getUrl(cluster);

        setRollup({
            status: PingStatus.Loading,
        });

        if (!url) {
            return;
        }
        let stale = false;
        const fetchPingMetrics = async () => {
            try {
                const response = await fetch(url);
                if (stale) {
                    return;
                }
                const json: { [interval: number]: ValidatorsAppPingStats[] } = await response.json();
                if (stale) {
                    return;
                }
                const simplify = (data: ValidatorsAppPingStats[]) =>
                    data.map<ValidatorsAppPingStatsRecord>(
                        ({ tps, median, time_from, num_of_records, average_slot_latency }: ValidatorsAppPingStats) => {
                            return {
                                average_slot_latency,
                                median,
                                submitted: num_of_records,
                                timestamp: new Date(time_from),
                                tps,
                            };
                        }
                    );

                const short = simplify(json[PING_INTERVALS[0]]).slice(-30);
                const medium = simplify(json[PING_INTERVALS[1]]).slice(-30);
                const long = simplify(json[PING_INTERVALS[2]]).slice(-30);

                setRollup({
                    long,
                    medium,
                    short,
                    status: PingStatus.Ready,
                });
            } catch {
                setRollup({
                    retry: () => {
                        setRollup({
                            status: PingStatus.Loading,
                        });

                        fetchPingMetrics();
                    },
                    status: PingStatus.Error,
                });
            }
        };

        const fetchPingInterval = setInterval(() => {
            fetchPingMetrics();
        }, FETCH_PING_INTERVAL);
        fetchPingMetrics();
        return () => {
            clearInterval(fetchPingInterval);
            stale = true;
        };
    }, [active, cluster, isTabVisible]);

    return <ValidatorsAppStatsContext.Provider value={rollup}>{children}</ValidatorsAppStatsContext.Provider>;
}

export function useValidatorsAppPingStats() {
    const context = React.useContext(ValidatorsAppStatsContext);
    if (!context) {
        throw new Error(`useContext must be used within a StatsProvider`);
    }
    return context;
}
