#!/usr/bin/env -S pnpm exec tsx

/**
 * Diffs two build-info route tables (see scripts/update-build-info.js).
 *
 * Usage:
 *   pnpm exec tsx scripts/build-info-diff.ts report <base.md> <fresh.md> [base-label]
 *   pnpm exec tsx scripts/build-info-diff.ts check <committed.md> <fresh.md>
 *
 * `report` prints a markdown bundle-change summary to stdout.
 * `check` exits 1 when the committed table drifts from the fresh one beyond
 * one display step, telling the author to rerun `pnpm build:info`.
 */

import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';

export interface RouteRow {
    firstLoad: string;
    route: string;
    size: string;
    type: string;
}

export interface RouteChange {
    after?: RouteRow;
    before?: RouteRow;
    kind: 'added' | 'changed' | 'removed';
    route: string;
}

// One step of the coarsest display unit: 10 kB cells and 0.01 MB (~10.49 kB) cells both round
// a 1-byte real difference into one step, so anything within ~11 KiB is display noise.
export const DISPLAY_STEP_TOLERANCE_BYTES = 11 * 1024;

function parseRow(line: string): RouteRow | undefined {
    // Data rows look like `| Static | \`/route\` | 130 kB | 530 kB |`; the backticked
    // route cell tells them apart from the header and separator rows.
    const cells = line.split('|').map(cell => cell.trim());
    if (cells.length !== 6 || cells[0] !== '' || cells[5] !== '') return undefined;
    const [, type, route, size, firstLoad] = cells;
    if (route.length < 3 || !route.startsWith('`') || !route.endsWith('`')) return undefined;
    return { firstLoad, route: route.slice(1, -1), size, type };
}

export function parseBuildInfoTable(markdown: string): RouteRow[] {
    const rows = markdown
        .split('\n')
        .map(parseRow)
        .filter((row): row is RouteRow => row !== undefined);
    if (rows.length === 0)
        throw new Error('No route table found in the given markdown; expected update-build-info.js output.');
    return rows;
}

const UNIT_FACTORS: Record<string, number> = { B: 1, MB: 1024 * 1024, kB: 1024 };

export function parseSizeBytes(cell: string): number | undefined {
    if (cell === '—') return undefined;
    const [value, unit, ...rest] = cell.split(' ');
    const factor = unit === undefined ? undefined : UNIT_FACTORS[unit];
    const numeric = Number(value);
    if (value === '' || Number.isNaN(numeric) || factor === undefined || rest.length > 0) {
        throw new Error(`Unrecognised size cell: "${cell}"; expected update-build-info.js formatting.`);
    }
    return numeric * factor;
}

export function diffBuildInfo(base: RouteRow[], fresh: RouteRow[]): RouteChange[] {
    const baseByRoute = new Map(base.map(row => [row.route, row]));
    const freshByRoute = new Map(fresh.map(row => [row.route, row]));
    const changes: RouteChange[] = [];

    for (const row of fresh) {
        const before = baseByRoute.get(row.route);
        if (!before) {
            changes.push({ after: row, kind: 'added', route: row.route });
        } else if (before.type !== row.type || before.size !== row.size || before.firstLoad !== row.firstLoad) {
            changes.push({ after: row, before, kind: 'changed', route: row.route });
        }
    }
    for (const row of base) {
        if (!freshByRoute.has(row.route)) changes.push({ before: row, kind: 'removed', route: row.route });
    }
    return changes.sort((a, b) => a.route.localeCompare(b.route));
}

export function exceedsTolerance(change: RouteChange, toleranceBytes = DISPLAY_STEP_TOLERANCE_BYTES): boolean {
    if (change.kind !== 'changed') return true;
    const { before, after } = change;
    if (!before || !after) return true;
    if (before.type !== after.type) return true;

    for (const cell of ['size', 'firstLoad'] as const) {
        const beforeBytes = parseSizeBytes(before[cell]);
        const afterBytes = parseSizeBytes(after[cell]);
        if ((beforeBytes === undefined) !== (afterBytes === undefined)) return true;
        if (
            beforeBytes !== undefined &&
            afterBytes !== undefined &&
            Math.abs(afterBytes - beforeBytes) > toleranceBytes
        ) {
            return true;
        }
    }
    return false;
}

function movementCell(before: string | undefined, after: string | undefined): string {
    if (before === undefined) return after ?? '—';
    if (after === undefined) return before;
    return before === after ? after : `${before} → ${after}`;
}

function routeCell(change: RouteChange): string {
    const flip =
        change.kind === 'changed' && change.before && change.after && change.before.type !== change.after.type
            ? ` _(${change.before.type} → ${change.after.type})_`
            : '';
    const suffix = change.kind === 'changed' ? flip : ` _(${change.kind})_`;
    return `\`${change.route}\`${suffix}`;
}

// Keeps only the -/+ payload: table rows self-identify, so git's file headers and hunk markers add noise.
function stripDiffHeaders(diff: string): string {
    const isHeader = (line: string) =>
        line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('--- ') ||
        line.startsWith('+++ ') ||
        line.startsWith('@@');
    return diff
        .split('\n')
        .filter(line => !isHeader(line))
        .join('\n')
        .trim();
}

export function formatReport(
    changes: RouteChange[],
    freshMarkdown: string,
    options: { baseLabel: string; diff?: string },
): string {
    const lines = [`### 📦 Bundle change vs \`${options.baseLabel}\``, ''];
    const significant = changes.filter(change => exceedsTolerance(change));
    const noiseCount = changes.length - significant.length;
    const diff = options.diff === undefined ? undefined : stripDiffHeaders(options.diff);

    if (significant.length === 0) {
        lines.push('No route size changes.');
    } else {
        const count = (kind: RouteChange['kind']) => significant.filter(change => change.kind === kind).length;
        lines.push(`**${count('changed')} changed · ${count('added')} added · ${count('removed')} removed**`);
    }

    if (diff) {
        lines.push('', '```diff', diff, '```');
    } else if (significant.length > 0) {
        lines.push('', '| Route | Size | First Load JS |', '|-------|------|---------------|');
        for (const change of significant) {
            const size = movementCell(change.before?.size, change.after?.size);
            const firstLoad = movementCell(change.before?.firstLoad, change.after?.firstLoad);
            lines.push(`| ${routeCell(change)} | ${size} | ${firstLoad} |`);
        }
    }
    if (noiseCount > 0) {
        lines.push('', `_${noiseCount} route${noiseCount === 1 ? '' : 's'} moved by one rounding step (noise)._`);
    }

    lines.push(
        '',
        '<details>',
        '<summary>Full route table (fresh build)</summary>',
        '',
        freshMarkdown.trim(),
        '',
        '</details>',
    );
    return lines.join('\n');
}

export function formatCheckFailure(changes: RouteChange[]): string {
    const lines = ['bench/BUILD.md is out of date with this branch’s build:'];
    for (const change of changes) {
        if (change.kind === 'changed') {
            const size = movementCell(change.before?.size, change.after?.size);
            const firstLoad = movementCell(change.before?.firstLoad, change.after?.firstLoad);
            lines.push(`  ${change.route}: Size ${size}, First Load JS ${firstLoad}`);
        } else {
            lines.push(`  ${change.route}: ${change.kind}`);
        }
    }
    lines.push('Run `pnpm build:info` and commit the refreshed bench/BUILD.md.');
    return lines.join('\n');
}

async function main() {
    const [mode, basePath, freshPath, baseLabel, diffPath] = process.argv.slice(2);
    if ((mode !== 'report' && mode !== 'check') || !basePath || !freshPath) {
        console.error('Usage: build-info-diff.ts <report|check> <base.md> <fresh.md> [base-label] [diff-file]');
        process.exit(2);
    }

    const base = parseBuildInfoTable(await readFile(basePath, 'utf8'));
    const freshMarkdown = await readFile(freshPath, 'utf8');
    const changes = diffBuildInfo(base, parseBuildInfoTable(freshMarkdown));

    if (mode === 'report') {
        const diff = diffPath ? await readFile(diffPath, 'utf8') : undefined;
        console.log(formatReport(changes, freshMarkdown, { baseLabel: baseLabel || 'master', diff }));
        return;
    }

    const drifted = changes.filter(change => exceedsTolerance(change));
    if (drifted.length > 0) {
        console.error(formatCheckFailure(drifted));
        process.exit(1);
    }
    console.log('bench/BUILD.md matches the fresh build (within one display step).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(`❌ ${error.message}`);
        process.exit(1);
    });
}
