import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseFeedbackForm } from '../BaseFeedbackForm';

const meta = {
    args: {
        bugReportUrl: 'https://github.com/solana-foundation/explorer/issues/new?template=bug_report.yml',
        ideasUrl: 'https://github.com/solana-foundation/explorer/issues/new?template=feature_request.yml',
        onOpenChange: fn(),
        onSubmit: fn(),
        open: true,
    },
    component: BaseFeedbackForm,
    parameters: {
        // The dialog portals to document.body; give the docs iframe room to show it fully.
        docs: { story: { height: '640px', inline: false } },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/Feedback/BaseFeedbackForm',
} satisfies Meta<typeof BaseFeedbackForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        // The dialog portals to document.body, outside the story canvas
        const body = within(canvasElement.ownerDocument.body);

        await expect(await body.findByRole('heading', { name: 'Give feedback' })).toBeInTheDocument();
        await userEvent.click(body.getByRole('radio', { name: '4 of 5 stars' }));
        await userEvent.type(body.getByLabelText('Feedback'), 'Great explorer!');
        await userEvent.click(body.getByRole('button', { name: 'Submit' }));

        await expect(args.onSubmit).toHaveBeenCalledWith({
            contact: undefined,
            message: 'Great explorer!',
            rating: 4,
        });
    },
};

export const CloseWithoutSubmit: Story = {
    play: async ({ canvasElement, args }) => {
        const body = within(canvasElement.ownerDocument.body);

        await userEvent.click(await body.findByRole('button', { name: 'Close' }));
        await expect(args.onOpenChange).toHaveBeenCalledWith(false);
        await expect(args.onSubmit).not.toHaveBeenCalled();
    },
};
