// Pure sort model for the block transactions table, split out of BlockHistoryCard so the ordering and
// the URL-param transitions can be unit-tested without rendering the component.

export type SortMode = 'index' | 'compute' | 'txnCost' | 'fee' | 'reservedCUs';
export type SortDirection = 'asc' | 'desc';

// Each column's natural first-click direction — index reads low→high, the numeric columns high→low.
export const DEFAULT_DIRECTION: Record<SortMode, SortDirection> = {
    compute: 'desc',
    fee: 'desc',
    index: 'asc',
    reservedCUs: 'desc',
    txnCost: 'desc',
};

// `DEFAULT_DIRECTION` is keyed by every valid mode, so it doubles as the set of accepted `sort` values.
export const isSortMode = (value: string | null): value is SortMode => value !== null && value in DEFAULT_DIRECTION;

// The transaction fields the comparators read. A structural subset of the table's row type so callers
// can pass their richer rows straight through.
export type SortableTransaction = {
    index: number;
    meta: { fee: bigint } | null;
    computeUnits?: number;
    costUnits?: bigint;
    reservedComputeUnits?: number;
};

// Returns a new array sorted by `mode`. Base comparators are ascending; `direction` flips them so a
// repeat click reverses the order. `compute` falls back to no-op when compute data isn't available for
// every row (`showComputeUnits` false), matching the hidden Compute column.
export function sortTransactions<T extends SortableTransaction>(
    txs: readonly T[],
    mode: SortMode,
    direction: SortDirection,
    showComputeUnits: boolean,
): T[] {
    const dir = direction === 'asc' ? 1 : -1;
    const sorted = [...txs];
    if (mode === 'index') {
        sorted.sort((a, b) => dir * (a.index - b.index));
    } else if (mode === 'compute' && showComputeUnits) {
        sorted.sort((a, b) => dir * compareIntegers(a.computeUnits, b.computeUnits));
    } else if (mode === 'txnCost') {
        sorted.sort((a, b) => dir * compareIntegers(a.costUnits, b.costUnits));
    } else if (mode === 'fee') {
        sorted.sort((a, b) => dir * compareIntegers(a.meta?.fee, b.meta?.fee));
    } else if (mode === 'reservedCUs') {
        sorted.sort((a, b) => dir * compareIntegers(a.reservedComputeUnits, b.reservedComputeUnits));
    }
    return sorted;
}

function compareIntegers(a: number | bigint | undefined, b: number | bigint | undefined): number {
    const left = typeof a === 'bigint' ? a : BigInt(a ?? 0);
    const right = typeof b === 'bigint' ? b : BigInt(b ?? 0);
    return left < right ? -1 : left > right ? 1 : 0;
}

// The next `sort`/`dir` URL params for a sort click, given the currently-active sort:
// - clicking the active column flips its direction;
// - clicking another column selects it at its natural default direction;
// - an `explicitDirection` (the mobile menu's per-direction rows) is used verbatim, skipping the toggle;
// - `index` ascending is the default view, written as a clean URL with the sort params removed.
// Other params on `current` are preserved.
export function nextSortParams(
    current: URLSearchParams,
    sortKey: SortMode,
    activeMode: SortMode,
    activeDirection: SortDirection,
    explicitDirection?: SortDirection,
): URLSearchParams {
    const toggledDirection: SortDirection = activeDirection === 'asc' ? 'desc' : 'asc';
    const nextDirection: SortDirection =
        explicitDirection ?? (sortKey === activeMode ? toggledDirection : DEFAULT_DIRECTION[sortKey]);

    const params = new URLSearchParams(current);
    if (sortKey === 'index' && nextDirection === 'asc') {
        params.delete('sort');
        params.delete('dir');
    } else {
        params.set('sort', sortKey);
        params.set('dir', nextDirection);
    }
    return params;
}
