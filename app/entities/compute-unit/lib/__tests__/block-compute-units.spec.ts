import type { BlockData, BlockTransaction } from '@entities/block-data/@x/compute-unit';
import { address, blockhash, lamports } from '@solana/kit';
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '@solana-program/compute-budget';
import { Cluster } from '@utils/cluster';

import { alloc, writeUint32LE } from '@/app/shared/lib/bytes';
import { getMaxComputeUnitsInBlock } from '@/app/utils/epoch-schedule';

import { summarizeBlockComputeUnits } from '../block-compute-units';

// A transaction whose only instruction is a ComputeBudget `SetComputeUnitLimit`, so its requested
// (reserved) compute units resolve to exactly `requestedUnits`. `consumed`/`cost` ride on the meta.
function mockTransaction({
    requestedUnits,
    consumed,
    cost,
    hasMeta = true,
}: {
    requestedUnits: number;
    consumed: number;
    cost: number;
    hasMeta?: boolean;
}) {
    const data = alloc(5);
    data[0] = 2; // SetComputeUnitLimit instruction type
    writeUint32LE(data, requestedUnits, 1);
    return {
        index: 0,
        message: {
            header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 0 },
            instructions: [{ data, programAddressIndex: 0 }],
            lifetimeToken: blockhash('11111111111111111111111111111111'),
            staticAccounts: [address(COMPUTE_BUDGET_PROGRAM_ADDRESS)],
            version: 'legacy',
        },
        meta: hasMeta
            ? {
                  computeUnitsConsumed: BigInt(consumed),
                  costUnits: BigInt(cost),
                  err: null,
                  fee: lamports(0n),
                  logMessages: [],
              }
            : null,
        signatures: [],
    } satisfies BlockTransaction;
}

function mockBlock(transactions: BlockData['transactions']): BlockData {
    return {
        blockTime: null,
        blockhash: blockhash('11111111111111111111111111111111'),
        parentSlot: 0n,
        previousBlockhash: blockhash('11111111111111111111111111111111'),
        rewards: [],
        transactions,
    };
}

const EPOCH = 1000n;
const CLUSTER = Cluster.MainnetBeta;

describe('summarizeBlockComputeUnits', () => {
    it('should sum consumed, requested and cost units across the block', () => {
        const block = mockBlock([
            mockTransaction({ consumed: 90_000, cost: 80_000, requestedUnits: 100_000 }),
            mockTransaction({ consumed: 40_000, cost: 30_000, requestedUnits: 50_000 }),
        ]);

        expect(summarizeBlockComputeUnits({ block, cluster: CLUSTER, epoch: EPOCH })).toEqual({
            consumed: 130_000n,
            cost: 110_000n,
            incomplete: false,
            max: getMaxComputeUnitsInBlock({ cluster: CLUSTER, epoch: EPOCH }),
            requested: 150_000,
        });
    });

    it('should treat a transaction with null meta as zero consumed/cost while still counting requested units', () => {
        const block = mockBlock([
            mockTransaction({ consumed: 0, cost: 0, hasMeta: false, requestedUnits: 100_000 }),
            mockTransaction({ consumed: 25_000, cost: 20_000, requestedUnits: 30_000 }),
        ]);

        expect(summarizeBlockComputeUnits({ block, cluster: CLUSTER, epoch: EPOCH })).toEqual({
            consumed: 25_000n,
            cost: 20_000n,
            incomplete: false,
            max: getMaxComputeUnitsInBlock({ cluster: CLUSTER, epoch: EPOCH }),
            requested: 130_000,
        });
    });

    it('should return zeroed totals (plus the block ceiling) for an empty block', () => {
        expect(summarizeBlockComputeUnits({ block: mockBlock([]), cluster: CLUSTER, epoch: EPOCH })).toEqual({
            consumed: 0n,
            cost: 0n,
            incomplete: false,
            max: getMaxComputeUnitsInBlock({ cluster: CLUSTER, epoch: EPOCH }),
            requested: 0,
        });
    });

    it('should mark readable-transaction totals as incomplete when any transaction is unavailable', () => {
        const block = mockBlock([
            mockTransaction({ consumed: 90_000, cost: 80_000, requestedUnits: 100_000 }),
            { index: 1, unavailable: true },
        ]);

        expect(summarizeBlockComputeUnits({ block, cluster: CLUSTER, epoch: EPOCH })).toEqual({
            consumed: 90_000n,
            cost: 80_000n,
            incomplete: true,
            max: getMaxComputeUnitsInBlock({ cluster: CLUSTER, epoch: EPOCH }),
            requested: 100_000,
        });
    });
});
