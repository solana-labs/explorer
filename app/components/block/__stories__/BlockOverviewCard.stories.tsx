import type { BlockData } from '@entities/block-data';
import { address, blockhash, unixTimestamp } from '@solana/kit';
import { nextjsParameters, withClusterAccountsAndTokenInfo } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockOverviewCard } from '../BlockOverviewCard';

const baseBlock: BlockData = {
    blockTime: unixTimestamp(1_700_000_000n),
    blockhash: blockhash('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'),
    parentSlot: 426_014_006n,
    previousBlockhash: blockhash('GfR1o2b8mVCg1KYp2f8vXbNqvY9dQyv2n8VnQyJc5Uab'),
    rewards: [],
    transactions: [],
};

const LEADER = address('So11111111111111111111111111111111111111112');
const PARENT_LEADER = address('Vote111111111111111111111111111111111111111');
const CHILD_LEADER = address('Stake11111111111111111111111111111111111111');

const meta = {
    component: BlockOverviewCard,
    decorators: [withClusterAccountsAndTokenInfo],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Block/BlockOverviewCard',
} satisfies Meta<typeof BlockOverviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        block: baseBlock,
        blockLeader: LEADER,
        childLeader: CHILD_LEADER,
        childSlot: 426_014_008n,
        epoch: 500n,
        parentLeader: PARENT_LEADER,
        slot: 426014007,
    },
};

export const NoTimestamp: Story = {
    args: {
        ...Default.args,
        block: { ...baseBlock, blockTime: null },
    },
};

export const MinimalNoLeaders: Story = {
    args: {
        block: baseBlock,
        epoch: 500n,
        slot: 426014007,
    },
};
