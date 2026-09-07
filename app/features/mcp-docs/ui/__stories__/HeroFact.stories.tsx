import type { Meta, StoryObj } from '@storybook-config/types';

import { HeroFact } from '../HeroFact';

const meta: Meta<typeof HeroFact> = {
    component: HeroFact,
    globals: { backgrounds: { value: 'dark' } },
    tags: ['autodocs', 'test'],
    title: 'Features/McpDocs/HeroFact',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: <span className="text-sm">Streamable HTTP, stateless</span>,
        label: 'Transport',
    },
};

/** How the facts read side by side in the hero grid. */
export const Grid: Story = {
    render: () => (
        <div className="grid max-w-xl gap-x-8 gap-y-4 sm:grid-cols-2">
            <HeroFact label="Transport">
                <span className="text-sm">Streamable HTTP, stateless</span>
            </HeroFact>
            <HeroFact label="Auth">
                <span className="text-sm">Open — no key required</span>
            </HeroFact>
            <HeroFact label="Clusters">
                <span className="text-sm">mainnet-beta · devnet · testnet · simd296</span>
            </HeroFact>
            <HeroFact label="Tools">
                <span className="text-sm">inspect_entity · ping</span>
            </HeroFact>
        </div>
    ),
};
