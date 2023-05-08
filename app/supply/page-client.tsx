'use client';

import { SupplyCard } from '@components/SupplyCard';
import { TopAccountsCard } from '@components/TopAccountsCard';
import { useCluster } from '@providers/cluster';
import { Cluster } from '@utils/cluster';
import React from 'react';

export default function SupplyPageClient() {
    const cluster = useCluster();
    return (
        <div className="container mt-4">
            <SupplyCard />
            {cluster.cluster === Cluster.Custom ? <TopAccountsCard /> : null}
        </div>
    );
}
