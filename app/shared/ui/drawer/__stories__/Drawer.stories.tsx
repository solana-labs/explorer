import { DialogTitle } from '@components/shared/ui/dialog';
import { nextjsParameters } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, within } from 'storybook/test';

import { Button } from '@/app/components/shared/ui/button';

import { Drawer } from '../Drawer';

const meta: Meta<typeof Drawer> = {
    args: {
        children: (
            <div className="px-4 py-2 text-sm text-white">
                Drag the handle down, press Escape, or tap Close to dismiss.
            </div>
        ),
        footer: (
            <Drawer.Footer>
                <Button className="flex-1" size="tile" variant="outline">
                    Close
                </Button>
            </Drawer.Footer>
        ),
        header: (
            <Drawer.Header>
                <DialogTitle className="!mt-0 text-base !text-outer-space-300">Details</DialogTitle>
            </Drawer.Header>
        ),
        onOpenChange: fn(),
        open: true,
    },
    component: Drawer,
    parameters: {
        ...nextjsParameters,
        viewport: { defaultViewport: 'mobile1' },
    },
    tags: ['autodocs', 'test'],
    title: 'Shared/Drawer@Media',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        const body = within(document.body);
        await body.findByRole('dialog');
        await expect(body.getByText('Details')).toBeInTheDocument();
    },
};
