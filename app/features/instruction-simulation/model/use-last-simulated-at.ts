'use client';

import React from 'react';

import { type SimulationState } from './use-simulation';

// Captures the wall-clock time of the last finished run (the transition out of `simulating`, on success
// OR error). The simulation model carries no timestamp; a result already cached on mount is not stamped
// since its true run time is unknown. Callers that live outside the panel (e.g. the merged Account List's
// header popover) use this to show the same time — each tracker captures the same transition, so the
// values agree.
export function useLastSimulatedAt(simulation: SimulationState): Date | undefined {
    const status = simulation.status;
    const [at, setAt] = React.useState<Date | undefined>(undefined);
    const prevStatus = React.useRef(status);

    React.useEffect(() => {
        if (prevStatus.current === 'simulating' && (status === 'done' || status === 'error')) {
            setAt(new Date());
        }
        prevStatus.current = status;
    }, [status]);

    return at;
}
