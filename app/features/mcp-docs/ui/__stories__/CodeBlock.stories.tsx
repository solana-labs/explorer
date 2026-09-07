import { withClipboardMock } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, userEvent, within } from 'storybook/test';

import { CodeBlock } from '../CodeBlock';

const COMMAND = `claude mcp add --transport http solana-explorer https://explorer.solana.com/mcp`;

const JSON_CONFIG = JSON.stringify(
    { mcpServers: { 'solana-explorer': { type: 'http', url: 'https://explorer.solana.com/mcp' } } },
    undefined,
    4,
);

const meta: Meta<typeof CodeBlock> = {
    component: CodeBlock,
    globals: { backgrounds: { value: 'dark' } },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/CodeBlock',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { code: COMMAND },
};

export const MultiLine: Story = {
    args: { code: JSON_CONFIG },
};

/** `flush` drops the own border/rounding to sit as a full-bleed segment inside a card. */
export const Flush: Story = {
    args: { code: COMMAND, variant: 'flush' },
};

export const Copy: Story = {
    args: { code: COMMAND },
    decorators: [withClipboardMock],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole('button', { name: 'Copy to clipboard' }));

        await expect(navigator.clipboard.writeText).toHaveBeenCalledWith(COMMAND);
    },
};
