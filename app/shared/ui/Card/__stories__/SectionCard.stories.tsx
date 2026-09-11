import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { Alert } from '@/app/shared/ui/Alert/Alert';
import { KeyValue } from '@/app/shared/ui/key-value';

import { SectionCard } from '../SectionCard';

const meta: Meta<typeof SectionCard> = {
    args: {
        children: (
            <>
                <KeyValue label="Address">11111111111111111111111111111111</KeyValue>
                <KeyValue label="Balance (SOL)">4.2069</KeyValue>
            </>
        ),
        title: 'Program Account',
    },
    component: SectionCard,
    tags: ['autodocs', 'test'],
    title: 'Shared/SectionCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: 'Program Account' })).toBeVisible();
    },
};

export const WithHeaderActions: Story = {
    args: {
        headerActions: (
            <button type="button" className="rounded border border-outer-space-800 px-2 py-1 text-xs text-white">
                Download
            </button>
        ),
    },
};

export const WithNote: Story = {
    args: {
        note: (
            <Alert variant="warning" appearance="outlined" className="!mb-0">
                Note that this is self-reported by the author of the program and might not be accurate.
            </Alert>
        ),
    },
};
