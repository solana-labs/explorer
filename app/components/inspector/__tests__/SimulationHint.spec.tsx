/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import type { SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';

import { SimulationHint } from '../SimulationHint';

const IDLE: SimulationState = { simulate: () => undefined, status: 'idle' };

describe('inspector::SimulationHint', () => {
    test('should explain the empty Change column, offer a run and link to the logs', () => {
        render(<SimulationHint simulation={IDLE} />);

        expect(screen.getByText(/Simulate to see balance changes/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Logs block' })).toHaveAttribute('href', '#logs');
        expect(screen.getByRole('button', { name: 'Simulate' })).toBeEnabled();
    });

    test('should disable the Simulate button while a run is in flight', () => {
        render(<SimulationHint simulation={{ status: 'simulating' }} />);

        expect(screen.getByRole('button')).toBeDisabled();
    });

    test('should say nothing once a run has produced usable balance changes', () => {
        const done = {
            result: { error: undefined, logs: [], solBalanceChanges: [] },
            simulate: () => undefined,
            status: 'done',
        } as unknown as SimulationState;

        const { container } = render(<SimulationHint simulation={done} />);

        expect(container).toBeEmptyDOMElement();
    });
});
