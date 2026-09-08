import type { BlockData } from '@entities/block-data';
import { blockhash } from '@solana/kit';
import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockAccountsCard } from '../BlockAccountsCard';

const meta: Meta<typeof BlockAccountsCard> = {
    component: BlockAccountsCard,
    decorators: [withCluster, withViewportFromGlobal],
    parameters: {
        ...nextjsParameters,
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Block/BlockAccountsCard@Media',
};

export default meta;
type Story = StoryObj<typeof meta>;

const block: BlockData = {
    blockTime: null,
    blockhash: blockhash('11111111111111111111111111111111'),
    parentSlot: 0n,
    previousBlockhash: blockhash('11111111111111111111111111111111'),
    rewards: [],
    transactions: [],
};
const args = { block, blockSlot: 312_456_789 };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
