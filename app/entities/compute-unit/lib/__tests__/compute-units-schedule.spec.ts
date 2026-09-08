import type { BlockTransaction } from '@entities/block-data/@x/compute-unit';
import { address, blockhash } from '@solana/kit';
import { ComputeBudgetProgram } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';

import { alloc, writeUint32LE } from '@/app/shared/lib/bytes';

import { estimateRequestedComputeUnits, getReservedComputeUnits } from '../compute-units-schedule';

describe('getReservedComputeUnits', () => {
    describe('mainnet', () => {
        it('should return default compute units before builtin feature activation', () => {
            // Before epoch 759 on mainnet
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 758n,
                    programId: '11111111111111111111111111111111', // System Program
                }),
            ).toEqual(200_000);

            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 0n,
                    programId: 'Vote111111111111111111111111111111111111111', // Vote Program
                }),
            ).toEqual(200_000);
        });

        it('should return minimal compute units for builtins after feature activation', () => {
            // After epoch 759 on mainnet
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 759n,
                    programId: '11111111111111111111111111111111', // System Program
                }),
            ).toEqual(3_000);

            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 1000n,
                    programId: 'Vote111111111111111111111111111111111111111', // Vote Program
                }),
            ).toEqual(200_000);

            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 759n,
                    programId: 'ComputeBudget111111111111111111111111111111', // Compute Budget
                }),
            ).toEqual(3_000);
        });

        it('should return default compute units for non-builtins after feature activation', () => {
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 759n,
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
                }),
            ).toEqual(200_000);
        });

        it('should handle feature gate program migration correctly', () => {
            // Before migration (epoch 753), feature gate is builtin
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 752n,
                    programId: 'Feature111111111111111111111111111111111111',
                }),
            ).toEqual(200_000); // Before builtin optimization

            // After builtin optimization but before migration
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 758n, // After 753 but before 759
                    programId: 'Feature111111111111111111111111111111111111',
                }),
            ).toEqual(200_000); // Still default because migration happened before builtin optimization

            // After both migration and builtin optimization
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: 759n,
                    programId: 'Feature111111111111111111111111111111111111',
                }),
            ).toEqual(200_000); // Now BPF, uses default
        });
    });

    describe('devnet', () => {
        it('should return correct compute units based on devnet activation epochs', () => {
            // Before epoch 842 on devnet
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.Devnet,
                    epoch: 841n,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(200_000);

            // After epoch 842 on devnet
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.Devnet,
                    epoch: 842n,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(3_000);
        });
    });

    describe('testnet', () => {
        it('should return correct compute units based on testnet activation epochs', () => {
            // Before epoch 750 on testnet
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.Testnet,
                    epoch: 749n,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(200_000);

            // After epoch 750 on testnet
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.Testnet,
                    epoch: 750n,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(3_000);
        });
    });

    describe('custom cluster', () => {
        it('should always use most recent configuration', () => {
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.Custom,
                    epoch: 0n,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(3_000);

            expect(
                getReservedComputeUnits({
                    cluster: Cluster.Custom,
                    epoch: 1000n,
                    programId: 'Feature111111111111111111111111111111111111',
                }),
            ).toEqual(200_000);
        });
    });

    describe('edge cases', () => {
        it('should handle undefined epoch', () => {
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(200_000);
        });

        it('should handle negative epoch', () => {
            expect(
                getReservedComputeUnits({
                    cluster: Cluster.MainnetBeta,
                    epoch: -1n,
                    programId: '11111111111111111111111111111111',
                }),
            ).toEqual(200_000);
        });
    });
});

describe('estimateRequestedComputeUnits', () => {
    const createMockTransaction = (
        instructions: Array<{
            programId: string;
            data: Uint8Array;
        }>,
    ): Parameters<typeof estimateRequestedComputeUnits>[0] => {
        const staticAccounts = [...new Set(instructions.map(ix => ix.programId))].map(address);

        return {
            index: 0,
            message: {
                header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 0 },
                instructions: instructions.map(ix => ({
                    data: ix.data,
                    programAddressIndex: staticAccounts.findIndex(account => account === ix.programId),
                })),
                lifetimeToken: blockhash('11111111111111111111111111111111'),
                staticAccounts,
                version: 'legacy',
            },
            meta: null,
            signatures: [],
        };
    };

    describe('with explicit compute budget', () => {
        it('should return compute units from SetComputeUnitLimit instruction', () => {
            const computeUnits = 300_000;
            const data = alloc(5);
            data[0] = 2; // SetComputeUnitLimit instruction type
            writeUint32LE(data, computeUnits, 1);

            const tx = createMockTransaction([
                {
                    data,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(computeUnits);
        });

        it('should return compute units from deprecated RequestUnits instruction', () => {
            const computeUnits = 150_000;
            const data = alloc(9); // RequestUnits needs 9 bytes
            data[0] = 0; // RequestUnits instruction type
            writeUint32LE(data, computeUnits, 1);
            writeUint32LE(data, 0, 5); // additionalFee

            const tx = createMockTransaction([
                {
                    data,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(computeUnits);
        });

        it('should prioritize first compute budget instruction found', () => {
            const data1 = alloc(5);
            data1[0] = 2;
            writeUint32LE(data1, 100_000, 1);

            const data2 = alloc(5);
            data2[0] = 2;
            writeUint32LE(data2, 200_000, 1);

            const tx = createMockTransaction([
                {
                    data: data1,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
                {
                    data: data2,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(100_000);
        });
    });

    describe('without explicit compute budget', () => {
        it('should return default for non-builtin programs', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(200_000);
        });

        it('should return minimal units for builtin programs after activation', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: '11111111111111111111111111111111',
                },
            ]);

            // After activation
            expect(estimateRequestedComputeUnits(tx, 759n, Cluster.MainnetBeta)).toEqual(3_000);

            // Before activation
            expect(estimateRequestedComputeUnits(tx, 758n, Cluster.MainnetBeta)).toEqual(200_000);
        });

        it('should return sum of reserved units for mixed instructions', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: '11111111111111111111111111111111', // System (3k after activation)
                },
                {
                    data: new Uint8Array([4, 5, 6]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token (200k)
                },
            ]);

            // Should return the sum (3k + 200k = 203k)
            expect(estimateRequestedComputeUnits(tx, 759n, Cluster.MainnetBeta)).toEqual(203_000);
        });

        it('should handle feature gate program correctly across epochs', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'Feature111111111111111111111111111111111111',
                },
            ]);

            // Before migration - uses default
            expect(estimateRequestedComputeUnits(tx, 752n, Cluster.MainnetBeta)).toEqual(200_000);

            // After migration and builtin optimization - still uses default (now BPF)
            expect(estimateRequestedComputeUnits(tx, 759n, Cluster.MainnetBeta)).toEqual(200_000);
        });
    });

    describe('edge cases', () => {
        it('should handle empty instruction data', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([]),
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            // ComputeBudget is a builtin, so after activation it gets 3k
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(3_000);
        });

        it('should handle invalid compute budget instruction data', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([2, 1, 2]), // Too short for SetComputeUnitLimit
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            // ComputeBudget is a builtin, so after activation it gets 3k
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(3_000);
        });

        it('should handle transactions with no instructions', () => {
            const tx = createMockTransaction([]);
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(0);
        });

        it('should respect the 1.4M compute unit cap', () => {
            // Create a transaction with many instructions that would exceed 1.4M
            const instructions = [];
            for (let i = 0; i < 10; i++) {
                instructions.push({
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // 200k each
                });
            }
            const tx = createMockTransaction(instructions);

            // Should cap at 1.4M even though sum would be 2M
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(1_400_000);
        });

        it('should handle compute budget with other instructions', () => {
            const data = alloc(5);
            data[0] = 2; // SetComputeUnitLimit
            writeUint32LE(data, 500_000, 1);

            const tx = createMockTransaction([
                {
                    data,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ]);

            // Should return the explicit compute budget, not the sum
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(500_000);
        });
    });

    describe('v1 transactions', () => {
        // Every case carries a ComputeBudget instruction, so the config has to win to pass.
        const createV1Transaction = (transactionConfig?: {
            computeUnitLimit?: number;
        }): Parameters<typeof estimateRequestedComputeUnits>[0] => {
            const data = alloc(5);
            data[0] = 2; // SetComputeUnitLimit
            writeUint32LE(data, 999_999, 1);

            const programAddress = address(ComputeBudgetProgram.programId.toBase58());
            const configValues =
                transactionConfig?.computeUnitLimit === undefined
                    ? []
                    : [{ kind: 'u32' as const, value: transactionConfig.computeUnitLimit }];

            return {
                index: 0,
                message: {
                    configMask: transactionConfig?.computeUnitLimit === undefined ? 0 : 4,
                    configValues,
                    header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 0 },
                    instructionHeaders: [
                        { numInstructionAccounts: 0, numInstructionDataBytes: data.length, programAccountIndex: 0 },
                    ],
                    instructionPayloads: [{ instructionAccountIndices: [], instructionData: data }],
                    lifetimeToken: blockhash('11111111111111111111111111111111'),
                    numInstructions: 1,
                    numStaticAccounts: 1,
                    staticAccounts: [programAddress],
                    version: 1,
                },
                meta: null,
                signatures: [],
            } satisfies BlockTransaction;
        };

        it('should read the limit from the message config rather than the instructions', () => {
            const tx = createV1Transaction({ computeUnitLimit: 10_000 });
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(10_000);
        });

        it('should report zero when the config sets no compute unit limit', () => {
            const tx = createV1Transaction({});
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(0);
        });

        it('should report zero when the message carries no config at all', () => {
            const tx = createV1Transaction(undefined);
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(0);
        });

        it('should respect the 1.4M compute unit cap', () => {
            const tx = createV1Transaction({ computeUnitLimit: 5_000_000 });
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(1_400_000);
        });
    });
});
