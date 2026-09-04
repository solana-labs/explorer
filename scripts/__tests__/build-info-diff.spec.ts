import {
    diffBuildInfo,
    DISPLAY_STEP_TOLERANCE_BYTES,
    exceedsTolerance,
    formatCheckFailure,
    formatReport,
    parseBuildInfoTable,
    parseSizeBytes,
    type RouteChange,
} from '../build-info-diff';

const table = (rows: string[]) =>
    [
        '> Sizes are gzipped, approximate, and rounded to reduce build-output noise.',
        '',
        '| Type | Route | Size | First Load JS |',
        '|------|-------|------|---------------|',
        ...rows,
    ].join('\n');

const BASE = table([
    '| Static | `/` | 130 kB | 530 kB |',
    '| Dynamic | `/address/[address]` | 500 kB | 900 kB |',
    '| Dynamic | `/api/search` | — | — |',
    '| Dynamic | `/tx/[signature]` | 1.48 MB | 1.88 MB |',
]);

describe('parseBuildInfoTable', () => {
    it('should parse every row into type, route, and size cells', () => {
        const rows = parseBuildInfoTable(BASE);
        expect(rows).toHaveLength(4);
        expect(rows[0]).toEqual({ firstLoad: '530 kB', route: '/', size: '130 kB', type: 'Static' });
        expect(rows[2]).toEqual({ firstLoad: '—', route: '/api/search', size: '—', type: 'Dynamic' });
    });

    it('should throw when the markdown contains no route table', () => {
        expect(() => parseBuildInfoTable('# nothing here')).toThrow('No route table');
    });
});

describe('parseSizeBytes', () => {
    it('should parse byte, kilobyte, and megabyte cells', () => {
        expect(parseSizeBytes('790 B')).toBe(790);
        expect(parseSizeBytes('160 kB')).toBe(160 * 1024);
        expect(parseSizeBytes('1.48 MB')).toBe(1.48 * 1024 * 1024);
    });

    it('should return undefined for the em-dash placeholder', () => {
        expect(parseSizeBytes('—')).toBeUndefined();
    });
});

describe('diffBuildInfo', () => {
    it('should return no changes for identical tables', () => {
        expect(diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(BASE))).toEqual([]);
    });

    it('should report a route present only in the fresh table as added', () => {
        const fresh = table(['| Static | `/` | 130 kB | 530 kB |', '| Static | `/new` | 10 kB | 420 kB |']);
        const changes = diffBuildInfo(
            parseBuildInfoTable(table(['| Static | `/` | 130 kB | 530 kB |'])),
            parseBuildInfoTable(fresh),
        );
        expect(changes).toEqual([expect.objectContaining({ kind: 'added', route: '/new' })]);
    });

    it('should report a route missing from the fresh table as removed', () => {
        const base = table(['| Static | `/` | 130 kB | 530 kB |', '| Static | `/old` | 10 kB | 420 kB |']);
        const changes = diffBuildInfo(
            parseBuildInfoTable(base),
            parseBuildInfoTable(table(['| Static | `/` | 130 kB | 530 kB |'])),
        );
        expect(changes).toEqual([expect.objectContaining({ kind: 'removed', route: '/old' })]);
    });

    it('should report a row whose size cells differ as changed', () => {
        const fresh = BASE.replace('| 500 kB | 900 kB |', '| 520 kB | 920 kB |');
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({ kind: 'changed', route: '/address/[address]' });
        expect(changes[0].before?.size).toBe('500 kB');
        expect(changes[0].after?.size).toBe('520 kB');
    });

    it('should report a Static/Dynamic flip as changed even when sizes match', () => {
        const fresh = BASE.replace('| Static | `/` |', '| Dynamic | `/` |');
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        expect(changes).toEqual([expect.objectContaining({ kind: 'changed', route: '/' })]);
    });
});

describe('exceedsTolerance', () => {
    const changed = (before: [string, string], after: [string, string]): RouteChange => ({
        after: { firstLoad: after[1], route: '/r', size: after[0], type: 'Static' },
        before: { firstLoad: before[1], route: '/r', size: before[0], type: 'Static' },
        kind: 'changed',
        route: '/r',
    });

    it('should tolerate a single 10 kB display-step movement', () => {
        expect(exceedsTolerance(changed(['470 kB', '870 kB'], ['480 kB', '880 kB']))).toBe(false);
    });

    it('should tolerate an adjacent 0.01 MB display-step movement', () => {
        expect(exceedsTolerance(changed(['1.48 MB', '1.88 MB'], ['1.49 MB', '1.89 MB']))).toBe(false);
    });

    it('should flag movement beyond one display step', () => {
        expect(exceedsTolerance(changed(['470 kB', '870 kB'], ['500 kB', '870 kB']))).toBe(true);
    });

    it('should flag added and removed routes regardless of size', () => {
        const row = { firstLoad: '420 kB', route: '/new', size: '10 kB', type: 'Static' as const };
        expect(exceedsTolerance({ after: row, kind: 'added', route: '/new' })).toBe(true);
        expect(exceedsTolerance({ before: row, kind: 'removed', route: '/new' })).toBe(true);
    });

    it('should flag a transition between a size and the em-dash placeholder', () => {
        expect(exceedsTolerance(changed(['—', '—'], ['10 kB', '420 kB']))).toBe(true);
    });

    it('should flag a Static/Dynamic flip', () => {
        const change = changed(['470 kB', '870 kB'], ['470 kB', '870 kB']);
        change.after = { firstLoad: '870 kB', route: '/r', size: '470 kB', type: 'Dynamic' };
        expect(exceedsTolerance(change)).toBe(true);
    });

    it('should expose a tolerance covering one step of either display unit', () => {
        expect(DISPLAY_STEP_TOLERANCE_BYTES).toBeGreaterThan(0.01 * 1024 * 1024);
        expect(DISPLAY_STEP_TOLERANCE_BYTES).toBeLessThan(2 * 10 * 1024);
    });
});

describe('formatReport', () => {
    it('should state that nothing changed when the diff is empty', () => {
        const report = formatReport([], BASE, { baseLabel: 'master' });
        expect(report).toContain('No route size changes');
        expect(report).toContain('master');
    });

    it('should suppress one-display-step movements as rounding noise', () => {
        const fresh = BASE.replace('| 500 kB | 900 kB |', '| 510 kB | 910 kB |');
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        const report = formatReport(changes, fresh, { baseLabel: 'master' });
        expect(report).not.toContain('500 kB → 510 kB');
        expect(report).toContain('1 route moved by one rounding step');
    });

    it('should list significant movements while counting noise separately', () => {
        const fresh = BASE.replace('| 500 kB | 900 kB |', '| 550 kB | 950 kB |').replace(
            '| 130 kB | 530 kB |',
            '| 140 kB | 540 kB |',
        );
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        const report = formatReport(changes, fresh, { baseLabel: 'master' });
        expect(report).toContain('500 kB → 550 kB');
        expect(report).not.toContain('130 kB → 140 kB');
        expect(report).toContain('1 route moved by one rounding step');
    });

    it('should render before → after cells for changed routes', () => {
        const fresh = BASE.replace('| 500 kB | 900 kB |', '| 520 kB | 920 kB |');
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        const report = formatReport(changes, fresh, { baseLabel: 'master' });
        expect(report).toContain('500 kB → 520 kB');
        expect(report).toContain('900 kB → 920 kB');
        expect(report).toContain('`/address/[address]`');
    });

    it('should label added and removed routes', () => {
        const changes: RouteChange[] = [
            {
                after: { firstLoad: '420 kB', route: '/new', size: '10 kB', type: 'Static' },
                kind: 'added',
                route: '/new',
            },
            {
                before: { firstLoad: '480 kB', route: '/old', size: '90 kB', type: 'Static' },
                kind: 'removed',
                route: '/old',
            },
        ];
        const report = formatReport(changes, BASE, { baseLabel: 'master' });
        expect(report).toContain('added');
        expect(report).toContain('removed');
        expect(report).toContain('`/new`');
        expect(report).toContain('`/old`');
    });

    it('should collapse the full fresh table inside a details block', () => {
        const report = formatReport([], BASE, { baseLabel: 'master' });
        expect(report).toContain('<details>');
        expect(report).toContain('| Static | `/` | 130 kB | 530 kB |');
    });

    it('should embed a provided unified diff in a diff fence instead of the synthesised table', () => {
        const fresh = BASE.replace('| 500 kB | 900 kB |', '| 550 kB | 950 kB |');
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        const diff = [
            '-| Dynamic | `/address/[address]` | 500 kB | 900 kB |',
            '+| Dynamic | `/address/[address]` | 550 kB | 950 kB |',
        ].join('\n');
        const report = formatReport(changes, fresh, { baseLabel: 'master', diff });
        expect(report).toContain('```diff');
        expect(report).toContain('+| Dynamic | `/address/[address]` | 550 kB | 950 kB |');
        expect(report).not.toContain('500 kB → 550 kB');
        expect(report).toContain('**1 changed · 0 added · 0 removed**');
    });

    it('should strip git diff headers and hunk markers from the fence', () => {
        const diff = [
            'diff --git a/.next/BUILD.base.md b/.next/BUILD.fresh.md',
            'index 1234567..89abcde 100644',
            '--- a/.next/BUILD.base.md',
            '+++ b/.next/BUILD.fresh.md',
            '@@ -7 +7 @@',
            '-| Dynamic | `/address/[address]` | 500 kB | 900 kB |',
            '+| Dynamic | `/address/[address]` | 550 kB | 950 kB |',
        ].join('\n');
        const report = formatReport([], BASE, { baseLabel: 'master', diff });
        expect(report).not.toContain('diff --git');
        expect(report).not.toContain('@@');
        expect(report).not.toContain('+++');
        expect(report).toContain('-| Dynamic | `/address/[address]` | 500 kB | 900 kB |');
    });

    it('should show the diff fence even when only prose changed', () => {
        const diff = ['-> old note', '+> new note'].join('\n');
        const report = formatReport([], BASE, { baseLabel: 'master', diff });
        expect(report).toContain('No route size changes');
        expect(report).toContain('```diff');
        expect(report).toContain('+> new note');
    });
});

describe('formatCheckFailure', () => {
    it('should name the drifted routes and instruct refreshing bench/BUILD.md', () => {
        const fresh = BASE.replace('| 500 kB | 900 kB |', '| 550 kB | 950 kB |');
        const changes = diffBuildInfo(parseBuildInfoTable(BASE), parseBuildInfoTable(fresh));
        const message = formatCheckFailure(changes);
        expect(message).toContain('/address/[address]');
        expect(message).toContain('pnpm build:info');
        expect(message).toContain('bench/BUILD.md');
    });
});
