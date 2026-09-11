'use client';

import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { DateTimePicker } from '@components/shared/ui/date-time-picker';
import { Input } from '@components/shared/ui/input';
import { Label } from '@components/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
// deep imports on purpose: the feature's own card renders this bar, so importing the
// barrel here would close a cycle through ui/TransactionHistoryCard
import { isGtfaDisabled } from '@features/transaction-history/lib/gtfa-disabled-addresses';
import { HistoryFilters } from '@features/transaction-history/lib/history-filters';
import { useHistoryFiltersSupported } from '@features/transaction-history/model/use-account-history';
import { format } from 'date-fns';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { ChevronDown, Filter, X } from 'react-feather';

// URL params map one-to-one onto the Triton `getTransactionsForAddress` filter paths.
export const SLOT_GTE_PARAM = 'slot.gte';
export const SLOT_LTE_PARAM = 'slot.lte';
export const BLOCK_TIME_GTE_PARAM = 'blockTime.gte';
export const BLOCK_TIME_LTE_PARAM = 'blockTime.lte';
export const STATUS_PARAM = 'status';

const STATUS_VALUES = ['succeeded', 'failed'] as const;

const STATUS_LABELS: Record<(typeof STATUS_VALUES)[number], string> = {
    failed: 'Failed',
    succeeded: 'Succeeded',
};

function parseSlotParam(raw: string | null | undefined): number | undefined {
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function parseEnumParam<T extends string>(raw: string | null | undefined, allowed: readonly T[]): T | undefined {
    return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

// Collapses an undefined-only range back to `undefined` so consumers can treat a
// present range object as "this filter is active".
function toRange(gte: number | undefined, lte: number | undefined) {
    return gte === undefined && lte === undefined ? undefined : { gte, lte };
}

export function useHistoryFilters(): HistoryFilters {
    const searchParams = useSearchParams();
    return {
        blockTime: toRange(
            parseSlotParam(searchParams?.get(BLOCK_TIME_GTE_PARAM)),
            parseSlotParam(searchParams?.get(BLOCK_TIME_LTE_PARAM)),
        ),
        slot: toRange(
            parseSlotParam(searchParams?.get(SLOT_GTE_PARAM)),
            parseSlotParam(searchParams?.get(SLOT_LTE_PARAM)),
        ),
        status: parseEnumParam(searchParams?.get(STATUS_PARAM), STATUS_VALUES),
    };
}

// Update operates directly on URL param names so callers reference the same gTFA paths.
type ParamUpdate = Record<string, number | string | undefined>;

function useUpdateHistoryFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return React.useCallback(
        (next: ParamUpdate) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            Object.entries(next).forEach(([key, value]) => {
                if (value === undefined) {
                    params.delete(key);
                } else {
                    params.set(key, String(value));
                }
            });
            const qs = params.toString();
            router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
        },
        [router, pathname, searchParams],
    );
}

// Clears every filter param from the URL in one update.
export function useClearHistoryFilters() {
    const updateFilters = useUpdateHistoryFilters();
    return React.useCallback(
        () =>
            updateFilters({
                [BLOCK_TIME_GTE_PARAM]: undefined,
                [BLOCK_TIME_LTE_PARAM]: undefined,
                [SLOT_GTE_PARAM]: undefined,
                [SLOT_LTE_PARAM]: undefined,
                [STATUS_PARAM]: undefined,
            }),
        [updateFilters],
    );
}

function slotDraftToValue(raw: string): number | undefined | 'invalid' {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return 'invalid';
    return Math.floor(parsed);
}

// datetime-local <-> unix seconds (local time, matching what the input displays).
function unixToLocalInput(sec: number | undefined): string {
    if (sec === undefined) return '';
    const d = new Date(sec * 1000);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, "yyyy-MM-dd'T'HH:mm");
}

function localInputToUnix(raw: string): number | undefined {
    if (!raw) return undefined;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
    return (
        <Badge ui="tw" variant="info">
            <span>
                {label}: {value}
            </span>
            <button
                type="button"
                onClick={onClear}
                aria-label={`Clear ${label.toLowerCase()} filter`}
                className="flex items-center justify-center border-none bg-transparent p-0 text-current opacity-70 hover:opacity-100"
            >
                <X size={12} />
            </button>
        </Badge>
    );
}

export function HistoryFilterChips(filters: HistoryFilters) {
    const { slot, blockTime, status } = filters;
    const updateFilters = useUpdateHistoryFilters();
    const hasAny = slot !== undefined || blockTime !== undefined || status !== undefined;
    if (!hasAny) return undefined;
    return (
        <>
            {slot?.gte !== undefined && (
                <FilterChip
                    label="Slot ≥"
                    value={slot.gte.toLocaleString()}
                    onClear={() => updateFilters({ [SLOT_GTE_PARAM]: undefined })}
                />
            )}
            {slot?.lte !== undefined && (
                <FilterChip
                    label="Slot ≤"
                    value={slot.lte.toLocaleString()}
                    onClear={() => updateFilters({ [SLOT_LTE_PARAM]: undefined })}
                />
            )}
            {status !== undefined && (
                <FilterChip
                    label="Status"
                    value={STATUS_LABELS[status]}
                    onClear={() => updateFilters({ [STATUS_PARAM]: undefined })}
                />
            )}
            {blockTime?.gte !== undefined && (
                <FilterChip
                    label="Block time ≥"
                    value={new Date(blockTime.gte * 1000).toLocaleString()}
                    onClear={() => updateFilters({ [BLOCK_TIME_GTE_PARAM]: undefined })}
                />
            )}
            {blockTime?.lte !== undefined && (
                <FilterChip
                    label="Block time ≤"
                    value={new Date(blockTime.lte * 1000).toLocaleString()}
                    onClear={() => updateFilters({ [BLOCK_TIME_LTE_PARAM]: undefined })}
                />
            )}
        </>
    );
}

const SELECT_CLASS =
    'h-9 w-full appearance-none rounded border border-outer-space-950 bg-heavy-metal-900 px-3 pr-8 font-mono text-xs text-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900';

export function HistoryFilterTrigger({ address, ...filters }: HistoryFilters & { address?: string }) {
    const { slot, blockTime, status } = filters;
    const updateFilters = useUpdateHistoryFilters();
    const clearFilters = useClearHistoryFilters();
    // Filtering needs gTFA. It's unavailable when the endpoint doesn't implement gTFA at all
    // (global `supported` flag) or when gTFA is temporarily disabled for this specific address
    // (the address falls back to getSignaturesForAddress, which can't honour filters).
    const supported = useHistoryFiltersSupported() && !(address !== undefined && isGtfaDisabled(address));
    const [open, setOpen] = React.useState(false);

    const [slotGteDraft, setSlotGteDraft] = React.useState('');
    const [slotLteDraft, setSlotLteDraft] = React.useState('');
    const [statusDraft, setStatusDraft] = React.useState('');
    const [blockTimeGteDraft, setBlockTimeGteDraft] = React.useState('');
    const [blockTimeLteDraft, setBlockTimeLteDraft] = React.useState('');

    // Depend on the scalar range bounds, not the `slot`/`blockTime` objects: `toRange`
    // allocates a fresh object on every render, so keying on the objects would re-run
    // this effect on unrelated parent re-renders (e.g. lazy per-row fetches) and silently
    // reset a draft the user is still editing before they click Apply.
    React.useEffect(() => {
        setSlotGteDraft(slot?.gte !== undefined ? String(slot.gte) : '');
        setSlotLteDraft(slot?.lte !== undefined ? String(slot.lte) : '');
        setStatusDraft(status ?? '');
        setBlockTimeGteDraft(unixToLocalInput(blockTime?.gte));
        setBlockTimeLteDraft(unixToLocalInput(blockTime?.lte));
    }, [slot?.gte, slot?.lte, blockTime?.gte, blockTime?.lte, status, open]);

    const slotGteValue = slotDraftToValue(slotGteDraft);
    const slotLteValue = slotDraftToValue(slotLteDraft);
    const blockTimeGteValue = localInputToUnix(blockTimeGteDraft);
    const blockTimeLteValue = localInputToUnix(blockTimeLteDraft);

    const slotGteInvalid = slotGteValue === 'invalid';
    const slotLteInvalid = slotLteValue === 'invalid';
    const slotRangeInvalid =
        typeof slotGteValue === 'number' && typeof slotLteValue === 'number' && slotGteValue > slotLteValue;
    const timeRangeInvalid =
        blockTimeGteValue !== undefined && blockTimeLteValue !== undefined && blockTimeGteValue > blockTimeLteValue;
    const hasError = slotGteInvalid || slotLteInvalid || slotRangeInvalid || timeRangeInvalid;

    const apply = () => {
        if (hasError) return;
        // The hasError guard above rules out the 'invalid' sentinel for both slots.
        updateFilters({
            [BLOCK_TIME_GTE_PARAM]: blockTimeGteValue,
            [BLOCK_TIME_LTE_PARAM]: blockTimeLteValue,
            [SLOT_GTE_PARAM]: slotGteValue as number | undefined,
            [SLOT_LTE_PARAM]: slotLteValue as number | undefined,
            [STATUS_PARAM]: parseEnumParam(statusDraft, STATUS_VALUES),
        });
        setOpen(false);
    };

    const clearAll = () => {
        clearFilters();
        setOpen(false);
    };

    const activeCount =
        (slot?.gte !== undefined ? 1 : 0) +
        (slot?.lte !== undefined ? 1 : 0) +
        (status !== undefined ? 1 : 0) +
        (blockTime?.gte !== undefined ? 1 : 0) +
        (blockTime?.lte !== undefined ? 1 : 0);
    const triggerLabel = activeCount === 0 ? 'Filters' : 'Edit filters';

    // gTFA is unavailable (endpoint-wide or for this address), so filtering can't be applied
    // server-side; show a disabled control rather than a misleading filter UI.
    if (!supported) {
        return (
            <Button
                size="sm"
                variant="outline"
                disabled
                // Re-enable pointer events on the disabled control so the cursor shows it's
                // unavailable and the explanatory title tooltip appears; the native `disabled`
                // attribute still blocks clicks.
                className="disabled:!pointer-events-auto disabled:cursor-not-allowed"
                aria-label="Filters unavailable"
                title="Transaction filtering is unavailable for this account or RPC endpoint"
            >
                <Filter />
                <span className="hidden md:inline">Filters</span>
            </Button>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button size="sm" variant="outline" aria-label={triggerLabel}>
                    <Filter />
                    <span className="hidden md:inline">{triggerLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4">
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        apply();
                    }}
                    className="flex flex-col gap-3"
                >
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-neutral-400">Slot ≥</label>
                        <Input
                            autoFocus
                            variant="dark"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Lower bound (optional)"
                            value={slotGteDraft}
                            aria-invalid={slotGteInvalid || slotRangeInvalid}
                            onChange={e => setSlotGteDraft(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-neutral-400">Slot ≤</label>
                        <Input
                            variant="dark"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Upper bound (optional)"
                            value={slotLteDraft}
                            aria-invalid={slotLteInvalid || slotRangeInvalid}
                            onChange={e => setSlotLteDraft(e.target.value)}
                        />
                    </div>
                    {slotRangeInvalid && <div className="text-xs text-destructive">Slot ≥ must be ≤ slot ≤.</div>}

                    <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium text-neutral-400" htmlFor="history-status-filter">
                            Status
                        </Label>
                        <div className="relative">
                            <select
                                id="history-status-filter"
                                aria-label="Status"
                                className={SELECT_CLASS}
                                value={statusDraft}
                                onChange={e => setStatusDraft(e.target.value)}
                            >
                                <option value="">Any</option>
                                <option value="succeeded">Succeeded</option>
                                <option value="failed">Failed</option>
                            </select>
                            <ChevronDown
                                size={14}
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-neutral-400">Block time ≥</label>
                        <DateTimePicker
                            value={blockTimeGteDraft}
                            aria-invalid={timeRangeInvalid}
                            onChange={setBlockTimeGteDraft}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-neutral-400">Block time ≤</label>
                        <DateTimePicker
                            value={blockTimeLteDraft}
                            aria-invalid={timeRangeInvalid}
                            onChange={setBlockTimeLteDraft}
                        />
                    </div>
                    {timeRangeInvalid && (
                        <div className="text-xs text-destructive">Block time ≥ must be on or before block time ≤.</div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        {activeCount > 0 && (
                            <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
                                Clear all
                            </Button>
                        )}
                        <Button type="submit" size="sm" variant="accent" disabled={hasError}>
                            Apply
                        </Button>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    );
}

// Combined bar kept for tests / any consumer that wants chips + trigger inline.
export function HistoryFilterBar({ address, ...props }: HistoryFilters & { address?: string }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <HistoryFilterChips {...props} />
            <HistoryFilterTrigger address={address} {...props} />
        </div>
    );
}
