import { nextjsParameters } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import type { SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';

import { SimulationHint } from '../SimulationHint';

const meta: Meta<typeof SimulationHint> = {
    component: SimulationHint,
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Inspector/SimulationHint',
};

export default meta;
type Story = StoryObj<typeof meta>;

const IDLE: SimulationState = { simulate: () => undefined, status: 'idle' };
const SIMULATING: SimulationState = { status: 'simulating' };

// Before a run: the Simulate button is enabled and the line points at the Logs block.
export const BeforeRun: Story = {
    args: { simulation: IDLE },
};

// While a run is in flight the button is disabled and shows its spinner; the hint stays put.
export const Running: Story = {
    args: { simulation: SIMULATING },
};
