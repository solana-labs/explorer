import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { KeyValue } from '../KeyValue';

const meta: Meta<typeof KeyValue> = {
    args: {
        children: '11111111111111111111111111111111',
        label: 'Address',
    },
    component: KeyValue,
    tags: ['autodocs', 'test'],
    title: 'Shared/KeyValue',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Address')).toBeVisible();
        await expect(canvas.getByText('11111111111111111111111111111111')).toBeVisible();
    },
};

export const Compact: Story = {
    args: { density: 'compact', label: 'Block' },
};

export const WithTrailing: Story = {
    args: {
        label: 'Balance',
        trailing: <span className="text-xs text-outer-space-300">SOL</span>,
    },
};

export const Rows: Story = {
    render: () => (
        <div className="max-w-lg">
            <KeyValue label="Address">11111111111111111111111111111111</KeyValue>
            <KeyValue label="Balance (SOL)">4.2069</KeyValue>
            <KeyValue label="Executable">Yes</KeyValue>
            <KeyValue label="A very long label that has to wrap onto several lines to fit">value</KeyValue>
        </div>
    ),
};
