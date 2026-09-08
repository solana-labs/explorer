import React from 'react';

import { useLastSimulatedAt } from '../model/use-last-simulated-at';
import { type SimulationState } from '../model/use-simulation';

export function LastSimulatedAtLabel({ at }: { at: Date }) {
    return (
        <p className="m-0 text-xs text-outer-space-300">
            Simulated at{' '}
            <span className="text-outer-space-200">
                {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </p>
    );
}

// Tracks the run time itself (unlike the Label variant, which takes a pre-captured time).
export function LastSimulatedAt({ simulation }: { simulation: SimulationState }) {
    const at = useLastSimulatedAt(simulation);
    // eslint-disable-next-line unicorn/no-null -- nothing to show before the first finished run
    if (!at) return null;
    return <LastSimulatedAtLabel at={at} />;
}
