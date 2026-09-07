import type { Meta, StoryObj } from '@storybook-config/types';

import { EndpointStatusValue } from '../EndpointStatus';

const meta: Meta<typeof EndpointStatusValue> = {
    component: EndpointStatusValue,
    globals: { backgrounds: { value: 'dark' } },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/EndpointStatus',
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the health probe resolves. */
export const Checking: Story = {
    args: { status: { state: 'checking' } },
};

/** The endpoint answered — dot plus round-trip latency. */
export const Ready: Story = {
    args: { status: { ms: 42, state: 'ready' } },
};

/** A 401 — the endpoint is up but gated behind an access key. */
export const Restricted: Story = {
    args: { status: { state: 'restricted' } },
};

/** A 403 — the endpoint is up but this visitor's IP is blocked; no key or config helps. */
export const Blocked: Story = {
    args: { status: { state: 'blocked' } },
};

/** A 5xx / network error — falls back to the "How to run" link. */
export const Disabled: Story = {
    args: { status: { state: 'disabled' } },
};
