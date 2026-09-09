import { type BlockData, isBlockTransaction } from '@entities/block-data/@x/compute-unit';
import { Cluster } from '@utils/cluster';

import { getMaxComputeUnitsInBlock } from '@/app/utils/epoch-schedule';

import { estimateRequestedComputeUnits } from './compute-units-schedule';

// A block's aggregate compute-unit figures, all in compute units:
// - `consumed`  — compute units actually used (sum of each transaction's `computeUnitsConsumed`).
// - `requested` — reserved/requested compute units (estimated per transaction).
// - `cost`      — cost units charged against the block limit (sum of each transaction's `costUnits`).
// - `max`       — the block's compute-unit ceiling for the given epoch/cluster.
export type BlockComputeUnitsSummary = {
    consumed: bigint;
    requested: number;
    cost: bigint;
    max: number;
    incomplete: boolean;
};

// Folds a block's per-transaction compute-unit figures into the four totals the block overview renders,
// keeping the aggregation (and its epoch/cluster lookups) out of the presentational card.
export function summarizeBlockComputeUnits({
    block,
    epoch,
    cluster,
}: {
    block: BlockData;
    epoch: bigint | undefined;
    cluster: Cluster;
}): BlockComputeUnitsSummary {
    const max = getMaxComputeUnitsInBlock({ cluster, epoch });
    let consumed = 0n;
    let requested = 0;
    let cost = 0n;
    let incomplete = false;
    for (const tx of block.transactions) {
        if (!isBlockTransaction(tx)) {
            incomplete = true;
            continue;
        }
        requested += estimateRequestedComputeUnits(tx, epoch, cluster);
        consumed += tx.meta?.computeUnitsConsumed ?? 0n;
        cost += tx.meta?.costUnits ?? 0n;
    }

    return { consumed, cost, incomplete, max, requested };
}
