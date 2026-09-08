import { isSortMode, nextSortParams, type SortableTransaction, sortTransactions } from '../block-history-sort';

function tx(overrides: Partial<SortableTransaction> & { index: number }): SortableTransaction {
    return { meta: { fee: 0n }, ...overrides };
}

describe('sortTransactions', () => {
    const rows: SortableTransaction[] = [
        tx({ computeUnits: 300, costUnits: 30n, index: 0, meta: { fee: 5n }, reservedComputeUnits: 3000 }),
        tx({ computeUnits: 100, costUnits: 10n, index: 1, meta: { fee: 15n }, reservedComputeUnits: 1000 }),
        tx({ computeUnits: 200, costUnits: 20n, index: 2, meta: { fee: 10n }, reservedComputeUnits: 2000 }),
    ];

    const indexes = (result: SortableTransaction[]) => result.map(r => r.index);

    it('should sort by index ascending and descending', () => {
        expect(indexes(sortTransactions(rows, 'index', 'asc', true))).toEqual([0, 1, 2]);
        expect(indexes(sortTransactions(rows, 'index', 'desc', true))).toEqual([2, 1, 0]);
    });

    it('should sort by fee', () => {
        expect(indexes(sortTransactions(rows, 'fee', 'asc', true))).toEqual([0, 2, 1]);
        expect(indexes(sortTransactions(rows, 'fee', 'desc', true))).toEqual([1, 2, 0]);
    });

    it('should sort by compute only when compute data is available', () => {
        expect(indexes(sortTransactions(rows, 'compute', 'asc', true))).toEqual([1, 2, 0]);
        // showComputeUnits false → comparator is a no-op, original order preserved.
        expect(indexes(sortTransactions(rows, 'compute', 'asc', false))).toEqual([0, 1, 2]);
    });

    it('should sort by transaction cost and reserved compute units', () => {
        expect(indexes(sortTransactions(rows, 'txnCost', 'desc', true))).toEqual([0, 2, 1]);
        expect(indexes(sortTransactions(rows, 'reservedCUs', 'asc', true))).toEqual([1, 2, 0]);
    });

    it('should not mutate the input array', () => {
        const input = [...rows];
        sortTransactions(input, 'fee', 'desc', true);
        expect(indexes(input)).toEqual([0, 1, 2]);
    });

    it('should treat missing numeric fields as zero', () => {
        const sparse = [tx({ index: 0, meta: null }), tx({ index: 1, meta: { fee: 1n } })];
        expect(sortTransactions(sparse, 'fee', 'desc', true).map(r => r.index)).toEqual([1, 0]);
    });
});

describe('nextSortParams', () => {
    const build = (
        params: string,
        sortKey: Parameters<typeof nextSortParams>[1],
        activeMode: Parameters<typeof nextSortParams>[2],
        activeDirection: Parameters<typeof nextSortParams>[3],
        explicit?: Parameters<typeof nextSortParams>[4],
    ) => nextSortParams(new URLSearchParams(params), sortKey, activeMode, activeDirection, explicit).toString();

    it('should select a new column at its natural default direction', () => {
        // index defaults to ascending → clean URL (no params); fee defaults to descending.
        expect(build('', 'index', 'fee', 'desc')).toBe('');
        expect(build('', 'fee', 'index', 'asc')).toBe('sort=fee&dir=desc');
    });

    it('should toggle the direction when the active column is re-clicked', () => {
        expect(build('sort=fee&dir=desc', 'fee', 'fee', 'desc')).toBe('sort=fee&dir=asc');
        expect(build('sort=fee&dir=asc', 'fee', 'fee', 'asc')).toBe('sort=fee&dir=desc');
    });

    it('should clear the sort params when landing on the default index-ascending view', () => {
        // index is active descending; re-click toggles to ascending → clean URL.
        expect(build('sort=index&dir=desc', 'index', 'index', 'desc')).toBe('');
    });

    it('should honour an explicit direction (the mobile per-direction menu rows)', () => {
        expect(build('', 'fee', 'index', 'asc', 'asc')).toBe('sort=fee&dir=asc');
        expect(build('sort=fee&dir=asc', 'index', 'fee', 'asc', 'desc')).toBe('sort=index&dir=desc');
    });

    it('should preserve unrelated params', () => {
        expect(build('filter=all', 'fee', 'index', 'asc')).toBe('filter=all&sort=fee&dir=desc');
        expect(build('filter=all&sort=fee&dir=desc', 'index', 'fee', 'desc')).toBe('filter=all');
    });
});

describe('isSortMode', () => {
    it('should accept every valid mode and reject anything else', () => {
        for (const mode of ['index', 'compute', 'txnCost', 'fee', 'reservedCUs']) {
            expect(isSortMode(mode)).toBe(true);
        }
        expect(isSortMode('bogus')).toBe(false);
        expect(isSortMode(null)).toBe(false);
    });
});
