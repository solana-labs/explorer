import { cn } from '@components/shared/utils';
import React from 'react';

import { Button } from '@/app/components/shared/ui/button';

import { type SimulationState } from '../model/use-simulation';

// Brand-green (accent) Simulate button shared across the inspector: the Account List's Change column, the
// simulation panel's primary control, and the Logs / CU-profiling empty-state prompts. The label reads
// "Simulate" at all times; while a run is in flight it is hidden — kept in flow so the button keeps its
// exact size — and a spinner is overlaid centred on top. `simulate` is present on every state except
// `simulating`. Size/padding differences between call sites come in via `size` + `className`.
export function SimulateButton({
    simulation,
    size = 'default',
    className,
}: {
    simulation: SimulationState;
    size?: 'default' | 'sm' | 'compact';
    className?: string;
}) {
    const isSimulating = simulation.status === 'simulating';
    const simulate = 'simulate' in simulation ? simulation.simulate : undefined;
    return (
        <Button
            variant="accent"
            size={size}
            className={cn('relative', className)}
            disabled={isSimulating}
            onClick={simulate}
        >
            <span className={cn(isSimulating && 'invisible')}>Simulate</span>
            {isSimulating && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="spinner-border spinner-border-sm" role="status" aria-label="Simulating" />
                </span>
            )}
        </Button>
    );
}
