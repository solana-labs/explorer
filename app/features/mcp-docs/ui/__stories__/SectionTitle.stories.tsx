import type { Meta, StoryObj } from '@storybook-config/types';

import { SectionTitle } from '../SectionTitle';

const meta: Meta<typeof SectionTitle> = {
    component: SectionTitle,
    globals: { backgrounds: { value: 'dark' } },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/SectionTitle',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'Setup',
        subtitle: 'Pick your tool, copy the config — snippets already point at this deployment. No API key needed.',
    },
};

/** Without a subtitle the heading stands alone. */
export const HeadingOnly: Story = {
    args: { children: 'Examples' },
};
