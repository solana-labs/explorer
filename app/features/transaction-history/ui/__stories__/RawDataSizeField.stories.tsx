import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { RawDataSizeField } from '../RawDataSizeField';

const data = new Uint8Array(Array.from({ length: 96 }, (_, i) => i));

const meta: Meta<typeof RawDataSizeField> = {
    args: { data, filename: 'transaction', size: data.length },
    component: RawDataSizeField,
    tags: ['autodocs', 'test'],
    title: 'Features/TransactionHistory/RawDataSizeField',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: '96' })).toBeVisible();
    },
};

export const Loading: Story = {
    args: { loading: true },
};

export const Unavailable: Story = {
    args: { data: undefined, size: undefined },
};

export const Empty: Story = {
    args: { data: new Uint8Array(0), size: 0 },
};
