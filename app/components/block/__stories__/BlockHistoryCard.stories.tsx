import type { BlockData, BlockTransaction } from '@entities/block-data';
import { address, blockhash, getBase58Decoder, lamports, signature } from '@solana/kit';
import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockHistoryCard } from '../BlockHistoryCard';

const emptyBlock: BlockData = {
    blockTime: null,
    blockhash: blockhash('11111111111111111111111111111111'),
    parentSlot: 0n,
    previousBlockhash: blockhash('11111111111111111111111111111111'),
    rewards: [],
    transactions: [],
};

// Programs the synthetic transactions invoke. Deliberately excludes the Compute Budget program so
// `estimateRequestedComputeUnits` never tries to parse the (empty) instruction data — it just adds the
// per-program reserved units, which is enough to populate the "Reserved CUs" column. Vote is last so it
// can be added only as a *secondary* program (never alone) — otherwise the card's default "All Except
// Votes" filter would hide those rows and the counts would look off.
const PROGRAM_IDS = [
    '11111111111111111111111111111111',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'Stake11111111111111111111111111111111111111',
    'Vote111111111111111111111111111111111111111',
];
const VOTE_INDEX = 3;

// Distinct placeholder signature per row — the Signature cell only truncates for display, it doesn't
// base58-decode, so these render as `Sig0…0000` style links.
const signatureFor = (i: number) => {
    const bytes = new Uint8Array(64);
    bytes[63] = i + 1;
    return signature(getBase58Decoder().decode(bytes));
};

// Standard-shaped program logs so `parseProgramLogs` can extract compute units. Each invocation emits the
// runtime's invoke / consumed / success triplet; the consumed amount varies per program and position so
// per-row Compute totals differ. A failed tx ends its last instruction with an error line instead of
// success. Only when *every* rendered tx yields compute units does the optional Compute column appear.
function logsForTx(programIdxs: number[], failed: boolean): string[] {
    const logs: string[] = [];
    programIdxs.forEach((idx, n) => {
        const id = PROGRAM_IDS[idx];
        const consumed = 450 + (((idx + 1) * (n + 1) * 175) % 4_000);
        const isLast = n === programIdxs.length - 1;
        logs.push(`Program ${id} invoke [1]`);
        logs.push(`Program ${id} consumed ${consumed} of 200000 compute units`);
        logs.push(failed && isLast ? `Program ${id} failed: custom program error: 0x1` : `Program ${id} success`);
    });
    return logs;
}

function makeBlock(txCount: number): BlockData {
    const keys = PROGRAM_IDS.map(address);
    const transactions: BlockTransaction[] = Array.from({ length: txCount }, (_, k) => {
        const failed = k % 4 === 0;
        // Primary rotates over the non-vote programs and is invoked a varying number of times (1..12) so
        // the "N ×" counter exercises single- and double-digit widths; every other tx also invokes Vote
        // once as a secondary.
        const primary = k % VOTE_INDEX;
        const primaryCount = 1 + (k % 12);
        const programIdxs = [
            ...Array.from({ length: primaryCount }, () => primary),
            ...(k % 2 === 0 ? [VOTE_INDEX] : []),
        ];
        return {
            index: k,
            message: {
                header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 0 },
                instructions: programIdxs.map(idx => ({ data: new Uint8Array(), programAddressIndex: idx })),
                lifetimeToken: blockhash('11111111111111111111111111111111'),
                staticAccounts: keys,
                version: 'legacy',
            },
            meta: {
                costUnits: BigInt(1_000 + (k % 7) * 350),
                err: failed ? { InstructionError: [0, { Custom: 1 }] } : null,
                fee: lamports(5_000n),
                innerInstructions: [],
                logMessages: logsForTx(programIdxs, failed),
            },
            signatures: [signatureFor(k)],
        };
    });
    return { ...emptyBlock, transactions };
}

const meta = {
    component: BlockHistoryCard,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Block/BlockHistoryCard',
} satisfies Meta<typeof BlockHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// A handful of transactions — a mix of Success / Failed rows and invoked programs.
export const WithTransactions: Story = {
    args: { block: makeBlock(8), epoch: 500n },
};

// More than one page (PAGE_SIZE = 25) so the "Load More" footer shows.
export const ManyTransactions: Story = {
    args: { block: makeBlock(30), epoch: 500n },
};

// No transactions → the "This block has no transactions" ErrorCard fallback.
export const EmptyBlock: Story = {
    args: { block: emptyBlock, epoch: 500n },
};
