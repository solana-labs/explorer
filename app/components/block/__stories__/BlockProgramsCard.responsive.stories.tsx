import type { BlockData } from '@entities/block-data';
import { blockhash } from '@solana/kit';
import { nextjsParameters, withCluster } from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BlockProgramsCard } from '../BlockProgramsCard';

const meta: Meta<typeof BlockProgramsCard> = {
    component: BlockProgramsCard,
    decorators: [withCluster, withViewportFromGlobal],
    parameters: {
        ...nextjsParameters,
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Block/BlockProgramsCard@Media',
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
const args = { block };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
