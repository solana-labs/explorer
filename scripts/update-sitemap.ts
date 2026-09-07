#!/usr/bin/env -S pnpm exec tsx

/**
 * Script to generate sitemap index with multiple sitemaps
 *
 * Usage:
 *   pnpm exec tsx scripts/update-sitemap.ts
 *
 * Prerequisites:
 *   Run `pnpm build:info` first to generate bench/BUILD.md
 *
 * Output:
 *   - public/sitemap.xml (sitemap index)
 *   - public/default-sitemap.xml (static pages)
 *   - public/accounts-sitemap.xml (known program addresses)
 */

import { XMLValidator } from 'fast-xml-parser';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { Cluster } from '../app/utils/cluster';
import { LOADER_IDS, PROGRAM_INFO_BY_ID, SPECIAL_IDS, SYSVAR_IDS, TOKEN_IDS } from '../app/utils/programs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const resolvePath = (relativePath: string) => join(__dirname, ...relativePath.split('/'));

const BASE_URL = 'https://explorer.solana.com';
const BUILD_MD_PATH = resolvePath('../bench/BUILD.md');
const SITEMAP_INDEX_PATH = resolvePath('../public/sitemap.xml');
const DEFAULT_SITEMAP_PATH = resolvePath('../public/default-sitemap.xml');
const ACCOUNTS_SITEMAP_PATH = resolvePath('../public/accounts-sitemap.xml');

const DEFAULT_PRIORITY = 0.5;
const DEFAULT_CHANGEFREQ = 'weekly';

interface RouteOverride {
    priority?: number;
    changefreq?: string;
}

const STATIC_OVERRIDES: Record<string, RouteOverride> = {
    '/': { priority: 0.7, changefreq: 'daily' },
    '/tx/inspector': { priority: 0.3, changefreq: 'weekly' },
};

// The MCP pages stay out until the MCP endpoint is announced — drop an entry to list it again.
const EXCLUDED_STATIC_ROUTES = ['/_not-found', '/opengraph-image.png', '/mcp/start', '/mcp/docs'];

// Collect all known program addresses from programs.ts (MainnetBeta only)
const MAINNET_PROGRAM_IDS = Object.entries(PROGRAM_INFO_BY_ID)
    .filter(([, info]) => info.deployments.includes(Cluster.MainnetBeta))
    .map(([address]) => address);

const PROGRAM_ADDRESSES = [
    ...new Set([
        ...MAINNET_PROGRAM_IDS,
        ...Object.keys(LOADER_IDS),
        ...Object.keys(SPECIAL_IDS),
        ...Object.keys(SYSVAR_IDS),
        ...Object.keys(TOKEN_IDS),
    ]),
];

const ACCOUNTS_PRIORITY = 0.4;
const ACCOUNTS_CHANGEFREQ = 'daily';

main();

async function main() {
    try {
        console.log('Reading BUILD.md...');
        const buildMd = await readFile(BUILD_MD_PATH, 'utf8');

        console.log('Parsing routes...');
        const routes = parseRoutes(buildMd);

        console.log('Generating default sitemap...');
        const defaultSitemap = generateDefaultSitemap(routes);
        validateXml(defaultSitemap, 'default-sitemap.xml');
        await writeFile(DEFAULT_SITEMAP_PATH, defaultSitemap, 'utf8');
        console.log(`  Written: ${DEFAULT_SITEMAP_PATH}`);

        console.log('Generating accounts sitemap...');
        const accountsSitemap = generateAccountsSitemap();
        validateXml(accountsSitemap, 'accounts-sitemap.xml');
        await writeFile(ACCOUNTS_SITEMAP_PATH, accountsSitemap, 'utf8');
        console.log(`  Written: ${ACCOUNTS_SITEMAP_PATH}`);

        console.log('Generating sitemap index...');
        const sitemapIndex = generateSitemapIndex();
        validateXml(sitemapIndex, 'sitemap.xml');
        await writeFile(SITEMAP_INDEX_PATH, sitemapIndex, 'utf8');
        console.log(`  Written: ${SITEMAP_INDEX_PATH}`);

        console.log('\nSummary:');
        console.log(`  Static pages: ${routes.length}`);
        console.log(`  Program accounts: ${PROGRAM_ADDRESSES.length}`);
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

interface BuildRoute {
    type: 'Static' | 'Dynamic';
    route: string;
    size: string;
    firstLoadJs: string;
}

/**
 * Parses BUILD.md markdown table into structured data
 */
function parseBuildMd(content: string): BuildRoute[] {
    const lines = content.split('\n');
    const routes: BuildRoute[] = [];

    for (const line of lines) {
        const cells = line.split('|').map(cell => cell.trim());
        if (cells.length < 5) continue;

        const [, type, routeCell, size, firstLoadJs] = cells;
        if (type !== 'Static' && type !== 'Dynamic') continue;

        // eslint-disable-next-line no-restricted-syntax -- Stripping markdown backticks from route cell
        const route = routeCell.replace(/`/g, '');
        routes.push({ type, route, size, firstLoadJs });
    }

    return routes;
}

/**
 * Validates XML content and throws if invalid
 */
function validateXml(xml: string, filename: string): void {
    const result = XMLValidator.validate(xml);
    if (result !== true) {
        throw new Error(`Invalid XML in ${filename}: ${result.err.msg} at line ${result.err.line}`);
    }
}

const isStatic = (r: BuildRoute) => r.type === 'Static';
const isNotApiRoute = (r: BuildRoute) => !r.route.startsWith('/api/');
const isNotDynamic = (r: BuildRoute) => !r.route.includes('[');
const isNotExcluded = (r: BuildRoute) => !EXCLUDED_STATIC_ROUTES.includes(r.route);

/**
 * Extracts static routes for sitemap
 */
function parseRoutes(content: string): string[] {
    return parseBuildMd(content)
        .filter(isStatic)
        .filter(isNotApiRoute)
        .filter(isNotDynamic)
        .filter(isNotExcluded)
        .map(r => r.route);
}

/**
 * Generates XML header for sitemaps
 */
function xmlHeader(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;
}

/**
 * Generates default sitemap for static pages
 */
function generateDefaultSitemap(routes: string[]): string {
    const urlEntries = routes.map(route => {
        const override = STATIC_OVERRIDES[route] || {};
        const priority = override.priority ?? DEFAULT_PRIORITY;
        const changefreq = override.changefreq ?? DEFAULT_CHANGEFREQ;
        const loc = route === '/' ? BASE_URL : `${BASE_URL}${route}`;

        return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    return `${xmlHeader()}
${urlEntries.join('\n')}
</urlset>
`;
}

/**
 * Generates accounts sitemap for known program addresses
 */
function generateAccountsSitemap(): string {
    const urlEntries = PROGRAM_ADDRESSES.map(address => {
        return `  <url>
    <loc>${BASE_URL}/address/${address}</loc>
    <changefreq>${ACCOUNTS_CHANGEFREQ}</changefreq>
    <priority>${ACCOUNTS_PRIORITY}</priority>
  </url>`;
    });

    return `${xmlHeader()}
${urlEntries.join('\n')}
</urlset>
`;
}

/**
 * Generates sitemap index pointing to individual sitemaps
 */
function generateSitemapIndex(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/default-sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/accounts-sitemap.xml</loc>
  </sitemap>
</sitemapindex>
`;
}
