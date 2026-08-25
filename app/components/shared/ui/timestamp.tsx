'use client';

import * as React from 'react';
import { CheckCircle, ChevronDown, Copy, Star, XCircle } from 'react-feather';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import {
    setPinnedTimestampDisplay,
    type TimestampDisplay,
    usePinnedTimestampDisplay,
} from '@/app/components/shared/ui/useTimestampDisplay';
import { cn } from '@/app/components/shared/utils';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';
import { displayTimestampAbsolute, displayTimestampRelative } from '@/app/utils/date';

// The global reset (`button:focus { outline: none !important }`) strips the UA ring, so — like every
// other button in components/shared/ui — restore a visible keyboard focus indicator via ring utilities.
const focusRing =
    'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

export interface TimestampProps {
    /** Unix timestamp in seconds (e.g. a block's `blockTime`). */
    unixTimestamp: number;
    /** Fallback representation for the trigger when nothing is pinned. Defaults to UTC. */
    display?: TimestampDisplay;
    /** Overrides the trigger label; the chevron is always appended. */
    children?: React.ReactNode;
    /** Fixed "now" (ms) for the relative label. Omit to use the live clock; supply it to freeze
     *  the relative value (deterministic demos/tests, or one shared clock across many instances). */
    referenceMs?: number;
    className?: string;
}

// Copy affordance built directly on the dk-free useCopyToClipboard hook so the component
// stays entirely on Tailwind/design-system tokens (the shared Copyable emits text-dk-* colors).
function CopyButton({ text }: { text: string }) {
    const [state, copy] = useCopyToClipboard(1000);
    const Icon = state === 'copied' ? CheckCircle : state === 'errored' ? XCircle : Copy;
    const color =
        state === 'copied'
            ? 'text-success-400'
            : state === 'errored'
              ? 'text-destructive'
              : 'text-neutral-500 hover:text-neutral-200';
    return (
        <button
            type="button"
            onClick={() => copy(text)}
            title="Copy"
            className={cn('flex cursor-pointer items-center border-0 bg-transparent p-0', focusRing, color)}
        >
            <Icon size={14} />
        </button>
    );
}

// One row of the dropdown: label + value, plus pin and copy affordances on the right.
function TimestampRow({
    label,
    value,
    isPinned,
    onTogglePin,
    withSeparator,
}: {
    label: string;
    value: string;
    isPinned: boolean;
    onTogglePin: () => void;
    withSeparator: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-start justify-between gap-6 px-4 py-3',
                isPinned && 'bg-white/[0.03]',
                withSeparator && 'border-b border-solid border-outer-space-800',
            )}
        >
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-neutral-500">{label}</span>
                <span className="whitespace-nowrap text-sm tabular-nums text-neutral-200">{value}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-3">
                <button
                    type="button"
                    onClick={onTogglePin}
                    aria-pressed={isPinned}
                    title={isPinned ? `Unpin ${label}` : `Pin ${label} as default`}
                    className={cn(
                        'flex cursor-pointer items-center border-0 bg-transparent p-0',
                        focusRing,
                        isPinned ? 'text-accent' : 'text-neutral-500 hover:text-neutral-200',
                    )}
                >
                    <Star size={14} fill={isPinned ? 'currentColor' : 'none'} />
                </button>
                <CopyButton text={value} />
            </div>
        </div>
    );
}

// Clock for the relative label. When `fixed` is given, use it verbatim (no ticking). Otherwise set
// once on mount — so SSR and the first client render use the absolute fallback and hydrate cleanly —
// then tick every second only while "Relative" is the shown format.
function useNow(ticking: boolean, fixed: number | undefined): number | undefined {
    const [now, setNow] = React.useState<number | undefined>(undefined);
    React.useEffect(() => {
        if (fixed !== undefined) return;
        setNow(Date.now());
        if (!ticking) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [ticking, fixed]);
    return fixed ?? now;
}

/**
 * Clickable timestamp: renders a formatted time with a chevron, and opens a dropdown
 * exposing the relative ("X ago"), UTC, local, and Unix-seconds representations — each
 * individually copyable and pinnable. Pinning a representation makes every Timestamp across
 * Explorer default to it. Use anywhere a timestamp is shown so the presentation stays consistent.
 */
export function Timestamp({ unixTimestamp, display = 'utc', children, referenceMs, className }: TimestampProps) {
    const pinned = usePinnedTimestampDisplay();
    const effective = pinned ?? display;
    // Tick while the trigger shows a relative label, or while the dropdown is open — its Relative
    // row is always rendered, so without this it would show the age frozen at page mount.
    const [open, setOpen] = React.useState(false);
    const now = useNow(open || effective === 'relative', referenceMs);

    const ms = unixTimestamp * 1000;
    const labels: Record<TimestampDisplay, string> = {
        local: displayTimestampAbsolute(ms, false),
        // Until `now` is set on the client, fall back to the absolute time so hydration matches.
        relative: now === undefined ? displayTimestampAbsolute(ms, false) : displayTimestampRelative(ms, now),
        unix: String(unixTimestamp),
        utc: displayTimestampAbsolute(ms, true),
    };

    const rows: { key: TimestampDisplay; label: string }[] = [
        { key: 'utc', label: 'UTC' },
        { key: 'local', label: 'Local' },
        { key: 'relative', label: 'Relative' },
        { key: 'unix', label: 'Unix Timestamp' },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex cursor-pointer items-start gap-1 border-0 bg-transparent p-0 text-left leading-snug',
                        // Force our standard (non-mono) font and whole-word wrapping even inside a font-mono/break-all cell.
                        'break-normal font-[family-name:var(--explorer-default-font)]',
                        'text-neutral-200 hover:text-white',
                        focusRing,
                        className,
                    )}
                >
                    <span className="min-w-0">{children ?? labels[effective]}</span>
                    <ChevronDown size={14} className="mt-0.5 shrink-0 text-neutral-500" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
                {rows.map((row, index) => (
                    <TimestampRow
                        key={row.key}
                        label={row.label}
                        value={labels[row.key]}
                        isPinned={pinned === row.key}
                        onTogglePin={() => setPinnedTimestampDisplay(pinned === row.key ? undefined : row.key)}
                        withSeparator={index < rows.length - 1}
                    />
                ))}
                <div className="flex items-start gap-1.5 border-t border-solid border-outer-space-800 px-4 py-2.5 text-xs leading-snug text-neutral-500">
                    <Star size={11} className="mt-0.5 shrink-0" />
                    Star a format to make it the default everywhere in Explorer.
                </div>
            </PopoverContent>
        </Popover>
    );
}
