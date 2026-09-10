'use client';

import { AdjacentClusterLink, SearchingClusterIndicator } from '@entities/cluster';
import { useCluster, useFirstAvailableBlock } from '@providers/cluster';
import React from 'react';

import { useClusterTransactionSearch } from '../model/use-cluster-transaction-search';
import { BaseTransactionNotFoundCard } from './BaseTransactionNotFoundCard';

export function TransactionNotFoundCard({ signature, retry }: { signature: string; retry?: () => void }) {
    const { cluster } = useCluster();
    const { status, searchingCluster, foundCluster } = useClusterTransactionSearch(signature, cluster);
    // The oldest served block only explains a transaction the other clusters do not have either, so it is
    // fetched at that point rather than on every transaction page.
    const firstAvailableBlock = useFirstAvailableBlock({ enabled: status === 'not-found' });

    let subtext: React.ReactNode = undefined;
    if (status === 'searching' && searchingCluster !== undefined) {
        subtext = (
            <span>
                <span className="align-middle">Transaction does not exist</span>
                <br />
                <SearchingClusterIndicator searchingCluster={searchingCluster} />
            </span>
        );
    } else if (status === 'found' && foundCluster !== undefined) {
        subtext = (
            <span>
                <span className="align-middle">Transaction does not exist</span>
                <br />
                <AdjacentClusterLink foundCluster={foundCluster} pathname={`/tx/${signature}`} />
            </span>
        );
    } else if (status === 'not-found' && firstAvailableBlock !== undefined && firstAvailableBlock > 0n) {
        subtext = `Note: Transactions processed before block ${firstAvailableBlock} are not available at this time`;
    }

    return <BaseTransactionNotFoundCard retry={retry} subtext={subtext} />;
}
