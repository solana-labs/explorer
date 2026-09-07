import type { Meta, StoryObj } from '@storybook-config/types';

import { InlineCode } from '../InlineCode';

const meta: Meta<typeof InlineCode> = {
    component: InlineCode,
    globals: { backgrounds: { value: 'dark' } },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/InlineCode',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { children: 'inspect_entity' },
};

/** Reads as a token inside running body copy, keeping the line box height. */
export const InSentence: Story = {
    render: () => (
        <p className="m-0 text-sm text-neutral-300">
            Pass <InlineCode>cluster</InlineCode> explicitly when the user is not on{' '}
            <InlineCode>mainnet-beta</InlineCode> — one of <InlineCode>devnet</InlineCode>,{' '}
            <InlineCode>testnet</InlineCode> or <InlineCode>simd296</InlineCode>.
        </p>
    ),
};
