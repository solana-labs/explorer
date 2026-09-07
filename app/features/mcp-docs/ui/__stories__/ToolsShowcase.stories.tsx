import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, userEvent, within } from 'storybook/test';

import { ToolsShowcase } from '../ToolsShowcase';

const meta: Meta<typeof ToolsShowcase> = {
    component: ToolsShowcase,
    globals: { backgrounds: { value: 'dark' } },
    parameters: { layout: 'padded' },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/ToolsShowcase',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Switching to the Ping tab swaps in its short reference. */
export const SwitchToPing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole('tab', { name: 'Ping' }));
        await expect(await canvas.findByText('Basic health tool', { exact: false })).toBeVisible();
    },
};

/** The collapsed "What it covers" section expands on click. */
export const ExpandCovers: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole('button', { name: 'What it covers' }));
        await expect(await canvas.findByText('Compressed NFTs', { exact: false })).toBeVisible();
    },
};
