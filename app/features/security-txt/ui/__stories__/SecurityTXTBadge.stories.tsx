import { nextjsParameters } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SecurityTXTBadge } from '../SecurityTXTBadge';

const meta: Meta<typeof SecurityTXTBadge> = {
    component: SecurityTXTBadge,
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Features/SecurityTxt/SecurityTXTBadge',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Included: Story = {
    args: { href: '/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/security' },
};

export const WithError: Story = {
    args: {
        error: 'Invalid security.txt format',
        href: '/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/security',
    },
};

export const NotFoundError: Story = {
    args: {
        error: 'Not found',
        href: '/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/security',
    },
};
