import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';

// A `done` run can still carry an execution error (it reverted); its deltas are unreliable, so only a
// `done` run without an error yields usable balance changes.
export function hasReliableChanges(
    simulation: SimulationState,
): simulation is Extract<SimulationState, { status: 'done' }> {
    return simulation.status === 'done' && !simulation.result.error;
}

// Message explaining a failed/reverted run, or `undefined` when it did not fail. The `done`-with-error
// case only carries a generic `TransactionError`, so it points at the Logs rather than repeating it.
export function simulationFailureMessage(simulation: SimulationState): string | undefined {
    if (simulation.status === 'error') return simulation.error;
    if (simulation.status === 'done' && simulation.result.error) {
        return 'Transaction reverted during simulation — see the Logs for the program error.';
    }
    return undefined;
}
