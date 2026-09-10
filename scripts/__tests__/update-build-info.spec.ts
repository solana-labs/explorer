import { parsePreviousCells, stabiliseCell } from '../update-build-info.js';

describe('stabiliseCell', () => {
    it('should keep the previous cell when the new bytes round within one display step', () => {
        // 470.2 kB ceils to 480 kB, one step from the previous 470 kB — display noise.
        expect(stabiliseCell(470.2 * 1024, '470 kB')).toBe('470 kB');
    });

    it('should keep the previous cell when the new bytes round to the same value', () => {
        expect(stabiliseCell(465 * 1024, '470 kB')).toBe('470 kB');
    });

    it('should adopt the new cell when movement exceeds one display step', () => {
        expect(stabiliseCell(495 * 1024, '470 kB')).toBe('500 kB');
    });

    it('should adopt the new cell when there is no previous cell', () => {
        expect(stabiliseCell(470.2 * 1024, undefined)).toBe('480 kB');
    });

    it('should adopt the new cell when the previous cell is the em-dash placeholder', () => {
        expect(stabiliseCell(470.2 * 1024, '—')).toBe('480 kB');
    });

    it('should stabilise adjacent megabyte steps', () => {
        // 1.487 MB formats to 1.49 MB — within one 0.01 MB step of the previous 1.48 MB.
        expect(stabiliseCell(1.487 * 1024 * 1024, '1.48 MB')).toBe('1.48 MB');
    });

    it('should not preserve a hand-edited cell the generator could never emit', () => {
        // "475 kB" parses fine and sits within tolerance, but only canonical output may anchor —
        // otherwise a hand-tuned bench/BUILD.md would pass the freshness gate verbatim.
        expect(stabiliseCell(470.2 * 1024, '475 kB')).toBe('480 kB');
        expect(stabiliseCell(1.487 * 1024 * 1024, '1.490 MB')).toBe('1.49 MB');
    });
});

describe('parsePreviousCells', () => {
    const previous = [
        '| Type | Route | Size | First Load JS |',
        '|------|-------|------|---------------|',
        '| Static | `/` | 130 kB | 530 kB |',
        '| Dynamic | `/api/search` | — | — |',
    ].join('\n');

    it('should map each route to its previously displayed cells', () => {
        const cells = parsePreviousCells(previous);
        expect(cells.get('/')).toEqual({ firstLoad: '530 kB', size: '130 kB' });
        expect(cells.get('/api/search')).toEqual({ firstLoad: '—', size: '—' });
    });

    it('should return an empty map for content without a table', () => {
        expect(parsePreviousCells('# nothing').size).toBe(0);
    });
});
