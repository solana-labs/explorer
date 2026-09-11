import { withClipboardMock } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { CopyableCode } from '../CopyableCode';

const meta: Meta<typeof CopyableCode> = {
    args: {
        value: 'solana-verify verify-from-repo -u https://api.mainnet-beta.solana.com https://github.com/example/program',
    },
    component: CopyableCode,
    decorators: [withClipboardMock],
    tags: ['autodocs', 'test'],
    title: 'Shared/CopyableCode',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await expect(within(canvasElement).getByText(args.value)).toBeVisible();
    },
};
