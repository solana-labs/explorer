'use client';

import { BlockHistoryCard } from '@components/block/BlockHistoryCard';
import { useBlock, useFetchBlock } from '@providers/block';
import { useCluster } from '@providers/cluster';
import { ClusterStatus } from '@utils/cluster';
import { notFound } from 'next/navigation';
import React from 'react';

type Props = Readonly<{ params: { slot: string } }>;

export default function BlockTransactionsTabClient({ params: { slot } }: Props) {
    const slotNumber = Number(slot);
    if (isNaN(slotNumber) || slotNumber >= Number.MAX_SAFE_INTEGER || slotNumber % 1 !== 0) {
        notFound();
    }
    const confirmedBlock = useBlock(slotNumber);
    const fetchBlock = useFetchBlock();
    const { status } = useCluster();
    // Fetch block on load
    React.useEffect(() => {
        if (!confirmedBlock && status === ClusterStatus.Connected) {
            fetchBlock(slotNumber);
        }
    }, [slotNumber, status]); // eslint-disable-line react-hooks/exhaustive-deps
    if (confirmedBlock?.data?.block) {
        return <BlockHistoryCard block={confirmedBlock.data.block} />;
    }
    return null;
}
