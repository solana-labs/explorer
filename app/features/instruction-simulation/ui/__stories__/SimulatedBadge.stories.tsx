import { nextjsParameters } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SimulatedBadge } from '../SimulatedBadge';

const meta: Meta<typeof SimulatedBadge> = {
    component: SimulatedBadge,
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Features/InstructionSimulation/SimulatedBadge',
};

export default meta;
type Story = StoryObj<typeof meta>;

// The compact "S" chip on the Account List's Change column and the inspector's Simulation tab.
export const Letter: Story = {
    args: { children: 'S' },
};

// The full "Simulated" label on a results card's title once a run has filled it.
export const Labelled: Story = {
    args: { children: 'Simulated' },
};
