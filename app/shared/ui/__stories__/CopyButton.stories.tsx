import { withClipboardMock } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, userEvent, within } from 'storybook/test';

import { CopyButton } from '../CopyButton';

const meta: Meta<typeof CopyButton> = {
    args: { value: '11111111111111111111111111111111' },
    component: CopyButton,
    decorators: [withClipboardMock],
    tags: ['autodocs', 'test'],
    title: 'Shared/CopyButton',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: 'Copy' });
        await userEvent.click(button);
        await expect(canvas.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    },
};

export const WithNoun: Story = {
    args: { noun: 'signature' },
};

export const Disabled: Story = {
    args: { disabled: true },
};
