import type { BlockData, BlockTransaction } from '@entities/block-data';
import { address, blockhash, lamports } from '@solana/kit';
import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockProgramsCard } from '../BlockProgramsCard';

const meta: Meta<typeof BlockProgramsCard> = {
    component: BlockProgramsCard,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Block/BlockProgramsCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

// Program ids used by the synthetic block below (valid base58 — no 0, O, I, l).
const PROGRAM_IDS = [
    'Vote111111111111111111111111111111111111111',
    'ComputeBudget111111111111111111111111111111',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    '11111111111111111111111111111111',
    'So11111111111111111111111111111111111111112',
];

// Build the Kit-native block shape consumed by BlockProgramsCard. Program j
// appears in every (j+1)-th transaction, giving a descending usage distribution; every 5th tx is
// marked failed (`err`) so Success Rate lands below 100%. All txs carry `meta`, so the Success Rate
// column shows.
function makeBlock(txCount: number): BlockData {
    const keys = PROGRAM_IDS.map(address);
    const transactions: BlockTransaction[] = Array.from({ length: txCount }, (_, k) => {
        const instructions = PROGRAM_IDS.map((_, j) => j)
            .filter(j => k % (j + 1) === 0)
            .map(j => ({ programAddressIndex: j }));
        return {
            index: k,
            message: {
                header: {
                    numReadonlyNonSignerAccounts: keys.length,
                    numReadonlySignerAccounts: 0,
                    numSignerAccounts: 0,
                },
                instructions,
                lifetimeToken: blockhash('11111111111111111111111111111111'),
                staticAccounts: keys,
                version: 'legacy',
            },
            meta: {
                err: k % 5 === 0 ? { InstructionError: [0, { Custom: 1 }] } : null,
                fee: lamports(5_000n),
                innerInstructions: [],
                logMessages: [],
            },
            signatures: [],
        };
    });
    return {
        blockTime: null,
        blockhash: blockhash('11111111111111111111111111111111'),
        parentSlot: 0n,
        previousBlockhash: blockhash('11111111111111111111111111111111'),
        rewards: [],
        transactions,
    };
}

export const WithData: Story = {
    args: {
        block: makeBlock(12),
    },
};

export const EmptyBlock: Story = {
    args: {
        block: makeBlock(0),
    },
};
