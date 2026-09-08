import { cn } from '@components/shared/utils';
import type { ReactNode } from 'react';

import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { SimulateButton } from '@/app/features/instruction-simulation/ui/SimulateButton';

import { hasReliableChanges } from './simulation-changes';

// One line of text and its action, wrapping onto a second row on narrow screens. `actionSide` decides
// whether the action leads the sentence or is pushed out to the far end of the line.
function HintLine({
    action,
    actionSide = 'leading',
    children,
    className,
}: {
    action: ReactNode;
    actionSide?: 'leading' | 'trailing';
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2 text-sm text-outer-space-300',
                actionSide === 'trailing' && 'justify-between gap-3',
                className,
            )}
        >
            {actionSide === 'leading' && action}
            <p className="m-0">{children}</p>
            {actionSide === 'trailing' && action}
        </div>
    );
}

// In-sentence anchor. styles.css colours every <a> dashkit green; these read as body text, so the grey
// is restored explicitly (a plain class beats the `a` element selector) and underlined.
function HintAnchor({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} className="text-outer-space-300 underline hover:text-white">
            {children}
        </a>
    );
}

// The line above the Account List card explaining an empty Change column and offering to run the
// simulation. Shown while the column has nothing to show (before a run, during one, after a failed one).
export function SimulationHint({ className, simulation }: { className?: string; simulation: SimulationState }) {
    // Nothing to explain once a run has produced deltas: the Change column speaks for itself.
    if (hasReliableChanges(simulation)) return undefined;

    return (
        <HintLine
            className={className}
            action={<SimulateButton simulation={simulation} size="sm" className="shrink-0" />}
        >
            Simulate to see balance changes. Full result appears in the <HintAnchor href="#logs">Logs block</HintAnchor>{' '}
            below.
        </HintLine>
    );
}
