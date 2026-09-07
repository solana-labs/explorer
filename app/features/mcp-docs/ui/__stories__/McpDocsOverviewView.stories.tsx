import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, userEvent, within } from 'storybook/test';

import { McpDocsOverviewView } from '../McpDocsOverviewView';

const meta: Meta<typeof McpDocsOverviewView> = {
    component: McpDocsOverviewView,
    globals: { backgrounds: { value: 'dark' } },
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/Overview',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The Setup and Tools sections are underline-tab switchers — each swaps its panel in place. */
export const SwitchesSections: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Setup: pick a different client, its config target replaces the panel.
        await userEvent.click(canvas.getByRole('tab', { name: 'Cursor' }));
        await expect(await canvas.findByText('Add to .cursor/mcp.json', { exact: false })).toBeVisible();

        // Tools: switch to ping, its reference replaces inspect_entity's.
        await userEvent.click(canvas.getByRole('tab', { name: 'Ping' }));
        await expect(await canvas.findByText('Basic health tool', { exact: false })).toBeVisible();
    },
};
