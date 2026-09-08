import type { BlockData, BlockTransaction } from '@entities/block-data';
import { address, blockhash, lamports } from '@solana/kit';
import { nextjsParameters, withCluster, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockAccountsCard } from '../BlockAccountsCard';

const meta: Meta<typeof BlockAccountsCard> = {
    component: BlockAccountsCard,
    decorators: [withCluster, withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Block/BlockAccountsCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

// Account addresses used by the synthetic block below (valid base58 — no 0, O, I, l). 13 entries so
// the list exceeds the initial 10 rows and the "Load More" control shows.
const ACCOUNT_IDS = [
    '11111111111111111111111111111111',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    'So11111111111111111111111111111111111111112',
    'SysvarRent111111111111111111111111111111111',
    'SysvarC1ock11111111111111111111111111111111',
    'Stake11111111111111111111111111111111111111',
    'Vote111111111111111111111111111111111111111',
    'BPFLoaderUpgradeab1e11111111111111111111111',
    'ComputeBudget111111111111111111111111111111',
    'AddressLookupTab1e1111111111111111111111111',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
];

// Build the Kit-native block shape consumed by BlockAccountsCard. Account j
// is referenced in every (j+1)-th transaction (descending usage); every 3rd account is writable, so
// the read-write / read-only split varies across rows.
function makeBlock(txCount: number): BlockData {
    const keys = ACCOUNT_IDS.map(address);
    const transactions: BlockTransaction[] = Array.from({ length: txCount }, (_, k) => {
        const accountKeyIndexes = ACCOUNT_IDS.map((_, j) => j).filter(j => k % (j + 1) === 0);
        return {
            index: k,
            message: {
                header: {
                    numReadonlyNonSignerAccounts: 8,
                    numReadonlySignerAccounts: 0,
                    numSignerAccounts: 0,
                },
                instructions: [{ accountIndices: accountKeyIndexes, programAddressIndex: 0 }],
                lifetimeToken: blockhash('11111111111111111111111111111111'),
                staticAccounts: keys,
                version: 'legacy',
            },
            meta: {
                err: null,
                fee: lamports(5_000n),
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
        block: makeBlock(20),
        blockSlot: 312_456_789,
    },
};

// Empty block — wrapper-only story for visual-regression coverage of the outer card.
export const EmptyBlock: Story = {
    args: {
        block: makeBlock(0),
        blockSlot: 312_456_789,
    },
};
