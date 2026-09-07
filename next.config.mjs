import { withSentryConfig } from '@sentry/nextjs';
import { withBotId } from 'botid/next/config';
import { fileURLToPath } from 'url';

import { buildRedirects } from './config/redirects.mjs';
import { createSentryBuildConfig } from './sentry/config.mjs';

// Pin both file-tracing and Turbopack to the project root; otherwise Next walks up to a parent
// pnpm-workspace.yaml (e.g. in git worktrees) and the two roots disagree.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use separate build directory for dev server to avoid conflicts with production builds
    distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
    outputFileTracingRoot: projectRoot,
    images: {
        remotePatterns: [
            {
                hostname: 'raw.githubusercontent.com',
                pathname: '/solana-labs/token-list/main/assets/**',
                port: '',
                protocol: 'https',
            },
        ],
    },
    // bigint-buffer loads its native .node via `bindings`, which walks up from the module's real
    // path — bundling it breaks that lookup and forces the pure-JS fallback warning.
    serverExternalPackages: ['bigint-buffer'],
    async headers() {
        const seoFileHeaders = [
            {
                key: 'Cache-Control',
                value: 'public, max-age=3600, stale-while-revalidate=86400',
            },
        ];

        // robots.txt is a route handler (app/robots.txt/route.ts) and owns its own Cache-Control.
        const headers = [
            { source: '/sitemap.xml', headers: seoFileHeaders },
            { source: '/default-sitemap.xml', headers: seoFileHeaders },
            { source: '/accounts-sitemap.xml', headers: seoFileHeaders },
        ];

        if (process.env.SEO_DISALLOW_BOTS === 'true') {
            headers.push({
                source: '/:path*',
                headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
            });
        }

        return headers;
    },
    async redirects() {
        return buildRedirects();
    },
    turbopack: {
        root: projectRoot,
        resolveAlias: {
            // @coral-xyz/anchor's nodewallet/workspace require('fs'), but those paths never run in the browser.
            fs: { browser: './empty.ts' },
        },
    },
};

export default withBotId(withSentryConfig(nextConfig, createSentryBuildConfig()));
