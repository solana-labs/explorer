import { useCluster } from '@providers/cluster';
import { useStatsProvider } from '@providers/stats/solanaClusterStats';
import React from 'react';
import { RefreshCw } from 'react-feather';

const CLUSTER_STATS_TIMEOUT = 5000;

export function StatsNotReady({ error }: { error: boolean }) {
    const { setTimedOut, retry, active } = useStatsProvider();
    const { cluster } = useCluster();

    React.useEffect(() => {
        let timedOut: NodeJS.Timeout;
        if (!error) {
            timedOut = setTimeout(setTimedOut, CLUSTER_STATS_TIMEOUT);
        }
        return () => {
            if (timedOut) {
                clearTimeout(timedOut);
            }
        };
    }, [setTimedOut, cluster, error]);

    if (error || !active) {
        return (
            <div className="card-body text-center">
                There was a problem loading cluster stats.{' '}
                <button
                    className="btn btn-white btn-sm"
                    onClick={() => {
                        retry();
                    }}
                >
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Try Again
                </button>
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
