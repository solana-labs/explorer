#!/usr/bin/env node

/**
 * Script to build Next.js app and capture route information
 *
 * Usage:
 *   node scripts/update-build-info.js [output-file]
 *
 * Examples:
 *   node scripts/update-build-info.js
 *   node scripts/update-build-info.js info.md
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { performance } = require('perf_hooks');

if (require.main === module) main();

async function main() {
    const config = getConfig();
    const logger = createLogger();

    try {
        logger.info('🏗️  Running pnpm build...');
        logger.separator();

        const buildStartTime = performance.now();
        await runBuild(config);
        const buildEndTime = performance.now();
        const buildDuration = ((buildEndTime - buildStartTime) / 1000).toFixed(2);
        logger.separator();
        logger.success(`Build completed in ${buildDuration}s`);

        const routes = await collectRoutes(config);
        const sizeInfo = await loadRouteSizes(config);
        const previousCells = await loadPreviousCells(config);
        const content = formatTable(routes, sizeInfo, previousCells);

        const outputPath = path.join(config.projectRoot, config.outputFile);
        await writeOutputFile(outputPath, content);

        logger.success(`Route information saved to: ${config.outputFile}`);
        logger.separator();
        process.exit(0);
    } catch (error) {
        logger.error(error.message);
        process.exit(1);
    }
}

// =============================================================================
// Build Runner
// =============================================================================
/**
 * Runs the build command, streaming its output straight to the terminal.
 *
 * We no longer parse stdout — all route/size information is read from the build
 * manifests afterwards — so the build output is purely for the user to watch.
 * @param {Object} config - Configuration object
 * @returns {Promise<void>} Resolves when the build succeeds, rejects on failure
 */
function runBuild(config) {
    return new Promise((resolve, reject) => {
        const build = spawn(config.buildCommand, config.buildArgs, {
            cwd: config.projectRoot,
            stdio: 'inherit',
        });

        build.on('close', code => {
            if (code !== 0) {
                reject(new Error(`Build failed with exit code ${code}`));
            } else {
                resolve();
            }
        });

        build.on('error', err => {
            reject(new Error(`Failed to start build process: ${err.message}`));
        });
    });
}

// =============================================================================
// Route Collector
// =============================================================================
async function readManifest(filePath) {
    // Failing loud here is the script's whole job — these manifests are an internal Next.js contract.
    let raw;
    try {
        raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        throw new Error(
            `Failed to read ${path.basename(filePath)} at ${filePath}: ${error.message}. This usually means the Next.js manifest layout changed; update scripts/update-build-info.js.`,
        );
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Failed to parse ${path.basename(filePath)} at ${filePath}: ${error.message}. This usually means the Next.js manifest format changed; update scripts/update-build-info.js.`,
        );
    }
}

/**
 * Collects the app's routes and their render type from the build manifests
 * (no stdout parsing required).
 *
 * - `app-path-routes-manifest.json` maps every entry file (`…/page`, `…/route`)
 *   to its public route path — the full route list.
 * - `prerender-manifest.json`'s `routes` lists the statically prerendered paths;
 *   a route is Static (○) iff it appears there, otherwise Dynamic (ƒ).
 *
 * The internal `/_global-error` boundary is excluded to match the routes
 * Next.js prints in its build summary.
 *
 * @param {Object} config - Configuration object
 * @returns {Promise<Array<{route: string, type: string}>>} Routes sorted by path
 */
async function collectRoutes(config) {
    const distDir = path.join(config.projectRoot, config.distDir);
    const pathRoutes = await readManifest(path.join(distDir, 'app-path-routes-manifest.json'));
    const prerender = await readManifest(path.join(distDir, 'prerender-manifest.json'));

    const staticRoutes = new Set(Object.keys(prerender.routes || {}));
    const routes = [...new Set(Object.values(pathRoutes))]
        .filter(route => route !== '/_global-error')
        .sort((a, b) => a.localeCompare(b))
        .map(route => ({ route, type: staticRoutes.has(route) ? 'Static' : 'Dynamic' }));

    return routes;
}

// =============================================================================
// Route Size Loader
// =============================================================================
/**
 * Loads per-route bundle sizes from the Next.js build diagnostics.
 *
 * Next.js 16 (Turbopack) no longer prints sizes to stdout; instead it writes
 * `<distDir>/diagnostics/route-bundle-stats.json`, which lists the first-load
 * chunk paths for every route that ships client JS. API routes ship none and
 * are absent from the file.
 *
 * The file only records uncompressed byte totals, but Next.js historically
 * reported gzipped sizes, so we gzip each chunk ourselves (matching the old
 * ~1.28 MB-magnitude numbers). We derive two numbers per route, mirroring the
 * columns Next.js used to print:
 *   - First Load JS: the gzipped total of the route's first-load chunks.
 *   - Size: the route-specific portion, i.e. First Load JS minus the baseline
 *     of chunks shared by every route.
 *
 * Note: Turbopack splits chunks differently than the pre-16 webpack build, so
 * the shared baseline (and therefore Size) differs in magnitude from older
 * BUILD.md snapshots even though First Load JS lines up.
 *
 * @param {Object} config - Configuration object
 * @returns {Promise<Map<string, {size: number, firstLoad: number}>>} Route → gzipped byte sizes
 */
async function loadRouteSizes(config) {
    const statsPath = path.join(config.projectRoot, config.distDir, 'diagnostics', 'route-bundle-stats.json');
    const stats = await readManifest(statsPath);

    // Chunks are shared across many routes; gzip each one at most once.
    const gzipCache = new Map();
    const gzipSize = async chunkPath => {
        if (!gzipCache.has(chunkPath)) {
            const absPath = path.join(config.projectRoot, chunkPath);
            let buf;
            try {
                buf = await fs.readFile(absPath);
            } catch (error) {
                // Missing chunk = manifest/disk mismatch; surfacing this is the whole point of the script.
                throw new Error(
                    `Chunk listed in route-bundle-stats.json is missing on disk: ${chunkPath} (${error.message}). This usually means Next.js changed how it emits or names chunks; update scripts/update-build-info.js.`,
                );
            }
            gzipCache.set(chunkPath, zlib.gzipSync(buf).length);
        }
        return gzipCache.get(chunkPath);
    };
    const sumGzip = async chunkPaths => {
        let total = 0;
        for (const chunkPath of chunkPaths) total += await gzipSize(chunkPath);
        return total;
    };

    // "Shared by all" = the chunks every route loads. Their summed size is the
    // baseline we subtract to get each route's own contribution.
    const sharedChunks = stats.reduce(
        (shared, entry) => shared.filter(chunk => entry.firstLoadChunkPaths.includes(chunk)),
        stats[0] ? [...stats[0].firstLoadChunkPaths] : [],
    );
    const sharedBytes = await sumGzip(sharedChunks);

    const sizes = new Map();
    for (const entry of stats) {
        const firstLoad = await sumGzip(entry.firstLoadChunkPaths);
        sizes.set(entry.route, { firstLoad, size: Math.max(0, firstLoad - sharedBytes) });
    }
    return sizes;
}

// =============================================================================
// Output Formatter
// =============================================================================
// One display step of the coarsest unit (10 kB cells, 0.01 MB ≈ 10.49 kB cells); mirrored in scripts/build-info-diff.ts.
const DISPLAY_STEP_TOLERANCE_BYTES = 11 * 1024;

/**
 * Parses a previously generated table into route → displayed cells, so a
 * regeneration can stabilise against it. Returns an empty map on prose-only content.
 * @param {string} content - Previous markdown file content
 * @returns {Map<string, {size: string, firstLoad: string}>} Route → displayed cells
 */
function parsePreviousCells(content) {
    const cells = new Map();
    for (const line of content.split('\n')) {
        // Data rows carry six `|`-delimited fields with a backticked route cell.
        const parts = line.split('|').map(cell => cell.trim());
        if (parts.length !== 6 || parts[0] !== '' || parts[5] !== '') continue;
        const route = parts[2];
        if (route.length < 3 || !route.startsWith('`') || !route.endsWith('`')) continue;
        cells.set(route.slice(1, -1), { firstLoad: parts[4], size: parts[3] });
    }
    return cells;
}

const CELL_UNIT_FACTORS = { B: 1, MB: 1024 * 1024, kB: 1024 };

/**
 * Parses a displayed cell back to bytes; undefined for the `—` placeholder or unknown formats.
 * @param {string} cell - Displayed cell like "470 kB"
 * @returns {number|undefined} Approximate byte count
 */
function parseCellBytes(cell) {
    const [value, unit, ...rest] = cell.split(' ');
    const factor = unit === undefined ? undefined : CELL_UNIT_FACTORS[unit];
    const numeric = Number(value);
    if (value === '' || Number.isNaN(numeric) || factor === undefined || rest.length > 0) return undefined;
    return numeric * factor;
}

/**
 * Rounding hysteresis: keeps the previously displayed cell when the new bytes
 * round within one display step of it, so edge-of-rounding builds don't flip cells.
 * @param {number} bytes - Fresh raw byte count
 * @param {string|undefined} previousCell - Cell displayed for this route in the previous table
 * @returns {string} Cell to display
 */
function stabiliseCell(bytes, previousCell) {
    const newCell = formatBytes(bytes);
    const previousBytes = previousCell === undefined ? undefined : parseCellBytes(previousCell);
    if (previousBytes === undefined) return newCell;
    // Only canonical generator output may anchor — a hand-edited cell must not survive regeneration.
    if (formatBytes(previousBytes) !== previousCell) return newCell;
    const newBytes = parseCellBytes(newCell);
    return Math.abs(newBytes - previousBytes) <= DISPLAY_STEP_TOLERANCE_BYTES ? previousCell : newCell;
}

/**
 * Formats the collected routes and their sizes into markdown table content
 * @param {Array<{route: string, type: string}>} routes - Routes from collectRoutes
 * @param {Map<string, {size: number, firstLoad: number}>} sizes - Sizes from loadRouteSizes
 * @param {Map<string, {size: string, firstLoad: string}>} previousCells - Cells from the committed table, for hysteresis
 * @returns {string} Formatted markdown file content
 */
function formatTable(routes, sizes, previousCells = new Map()) {
    const tableLines = [];

    tableLines.push(
        '> Sizes are gzipped, approximate, and rounded to reduce build-output noise. Next.js 16 (Turbopack) no longer prints sizes to stdout; these are derived by gzipping the first-load chunks listed in `.next/diagnostics/route-bundle-stats.json`. `Size` is First Load JS minus the chunks shared by all routes. Routes with no client JS (e.g. API routes) show `—`. A cell keeps its previous value while the fresh bytes round within one step of it, so edge-of-rounding builds stay stable.',
    );
    tableLines.push('');
    tableLines.push('| Type | Route | Size | First Load JS |');
    tableLines.push('|------|-------|------|---------------|');

    for (const { route, type } of routes) {
        const stat = sizes.get(route);
        const previous = previousCells.get(route);
        const size = stat ? stabiliseCell(stat.size, previous && previous.size) : '—';
        const firstLoad = stat ? stabiliseCell(stat.firstLoad, previous && previous.firstLoad) : '—';
        tableLines.push(`| ${type} | \`${route}\` | ${size} | ${firstLoad} |`);
    }

    return tableLines.join('\n');
}

/**
 * Formats a raw byte count into a rounded human-readable size, trading exact
 * resolution for stability across builds:
 * - < 1 kB: rounded to nearest 10 B
 * - < 1000 kB: ceiled to nearest 10 kB
 * - otherwise: MB with 2 decimal places (~10 kB granularity)
 * @param {number} bytes - Raw byte count
 * @returns {string} Rounded size string like "790 B", "160 kB", or "1.48 MB"
 */
function formatBytes(bytes) {
    if (bytes < 1024) return `${Math.round(bytes / 10) * 10} B`;
    const kb = Math.ceil(bytes / 1024 / 10) * 10;
    if (kb < 1000) return `${kb} kB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Loads the committed bench/BUILD.md as the hysteresis anchor — always the canonical
 * path, not the output file, so custom output targets still stabilise against the snapshot.
 * @param {Object} config - Configuration object
 * @returns {Promise<Map<string, {size: string, firstLoad: string}>>} Route → displayed cells; empty when missing
 */
async function loadPreviousCells(config) {
    try {
        return parsePreviousCells(await fs.readFile(path.join(config.projectRoot, 'bench/BUILD.md'), 'utf8'));
    } catch {
        return new Map();
    }
}

// =============================================================================
// File Writer
// =============================================================================
/**
 * Writes content to a file asynchronously
 * @param {string} filePath - Path to output file
 * @param {string} content - Content to write
 * @returns {Promise<void>} Resolves when file is written successfully
 */
async function writeOutputFile(filePath, content) {
    try {
        await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
        throw new Error(`Failed to write output file: ${error.message}`);
    }
}

// =============================================================================
// Logger
// =============================================================================
/**
 * Creates a logger object with utility methods for formatted console output
 * @returns {Object} Logger object with logging methods
 * @returns {Function} returns.separator - Prints a horizontal line separator
 * @returns {Function} returns.info - Prints an informational message
 * @returns {Function} returns.success - Prints a success message with checkmark
 * @returns {Function} returns.error - Prints an error message with X mark to stderr
 */
function createLogger() {
    return {
        separator: () => console.log('━'.repeat(70)),
        info: msg => console.log(msg),
        success: msg => console.log(`✅ ${msg}`),
        error: msg => console.error(`❌ ${msg}`),
    };
}

// =============================================================================
// Config
// =============================================================================
/**
 * Parses command line arguments and returns configuration object
 * @returns {Object} Configuration object
 * @returns {string} returns.outputFile - Output filename from first non-flag argument (default: 'BUILD.md')
 * @returns {string} returns.buildCommand - Build command to execute (default: 'pnpm')
 * @returns {string[]} returns.buildArgs - Arguments to pass to build command (default: ['build'])
 * @returns {string} returns.projectRoot - Absolute path to project root directory
 * @returns {string} returns.distDir - Build output directory holding the diagnostics (default: '.next')
 */
function getConfig() {
    const nonFlagArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));

    return {
        outputFile: nonFlagArgs[0] || 'bench/BUILD.md',
        buildCommand: 'pnpm',
        buildArgs: ['build'],
        projectRoot: path.join(__dirname, '..'),
        // `next build` runs with NODE_ENV=production, so it always emits to `.next`
        // (next.config's `.next-dev` distDir only applies to the dev server).
        distDir: '.next',
    };
}

module.exports = { parsePreviousCells, stabiliseCell };
