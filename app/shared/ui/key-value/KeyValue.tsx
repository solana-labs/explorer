import React from 'react';

import { cn } from '@/app/components/shared/utils';

// Shared label-column width so values line up in one column across every card and Raw-view row.
export const LABEL_WIDTH = 'w-[clamp(84px,20%,240px)]';

/**
 * A key-value row: a fixed-width label column beside a flexible value column, aligned on the text
 * baseline. `density="compact"` tightens the padding for drawer/mobile rows.
 */
export function KeyValue({
    label,
    trailing,
    labelWidth = LABEL_WIDTH,
    density = 'comfortable',
    divider = true,
    className,
    valueClassName,
    children,
}: {
    label: React.ReactNode;
    trailing?: React.ReactNode;
    labelWidth?: string;
    density?: 'comfortable' | 'compact';
    divider?: boolean;
    className?: string;
    valueClassName?: string;
    children: React.ReactNode;
}) {
    const compact = density === 'compact';
    return (
        <div
            className={cn(
                'flex flex-row items-baseline border-0 border-solid border-dark-border',
                divider && 'border-b last:border-b-0',
                compact ? 'gap-2 py-1' : 'gap-dk-4 px-3 py-2',
                className,
            )}
        >
            <div
                className={cn(
                    'min-w-0 flex-none text-sm leading-5 text-outer-space-300 [hyphens:auto] [overflow-wrap:break-word]',
                    // Baseline shim: nudge the label onto the row baseline (comfortable rows only).
                    compact ? 'py-0' : 'pb-px pt-[3px]',
                    labelWidth,
                )}
            >
                {label}
            </div>
            <div className={cn('flex min-w-0 flex-1 text-sm [overflow-wrap:anywhere]', valueClassName)}>{children}</div>
            {trailing}
        </div>
    );
}
