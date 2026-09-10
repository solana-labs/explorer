import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import { defineConfig } from 'vitest/config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const specWorkspace = (name = 'specs') => ({
    environment: 'jsdom',
    globals: true,
    name,
    server: {
        deps: {
            inline: [
                '@noble',
                'change-case',
                '@solana/kit',
                '@solana/rpc',
                '@solana/rpc-spec',
                '@solana/event-target-impl',
                '@solana/addresses',
            ],
        },
    },
    setupFiles: ['./test-setup.ts'],
    testTimeout: 10000,
});

export default defineConfig({
    // CI routes the dep-optimize cache off the cramped root partition onto /mnt; unset locally falls back to node_modules/.vite.
    cacheDir: process.env.VITE_CACHE_PATH || undefined,
    plugins: [react()],
    resolve: {
        alias: {
            '@/': `${path.resolve(__dirname, './')}/`,

            '@/app': path.resolve(__dirname, './app'),
            '@/components': path.resolve(__dirname, './app/components'),
            '@/providers': path.resolve(__dirname, './app/providers'),
            '@/utils': path.resolve(__dirname, './app/utils'),
            '@/validators': path.resolve(__dirname, './app/validators'),

            // @ aliases
            '@__fixtures__': path.resolve(__dirname, './app/__fixtures__'),
            '@app': path.resolve(__dirname, './app'),
            '@img': path.resolve(__dirname, './app/img'),
            '@components': path.resolve(__dirname, './app/components'),
            '@entities': path.resolve(__dirname, './app/entities'),
            '@features': path.resolve(__dirname, './app/features'),
            '@providers': path.resolve(__dirname, './app/providers'),
            '@shared': path.resolve(__dirname, './app/shared'),
            '@utils': path.resolve(__dirname, './app/utils'),
            '@storybook-config': path.resolve(__dirname, './.storybook'),
            '@validators': path.resolve(__dirname, './app/validators'),

            // `server-only` throws under the `default` condition set below; only Next's RSC build
            // resolves it to a no-op, so specs importing a `server.ts` barrel need the stub.
            'server-only': path.resolve(__dirname, './empty.ts'),
        },
        conditions: ['browser', 'default'],
    },
    test: {
        // packages/** self-test via `pnpm test:packages` (own configs/environments) — the root sweep
        // would double-run them under the app's jsdom env.
        exclude: ['**/node_modules/**', '.claude/**', '.worktrees/**', 'packages/**'],
        projects: [
            {
                extends: true,
                // No `typecheck`: the only *.spec-d.ts files live in packages/, which self-typecheck, so
                // enabling it here collected nothing and still reported "Type Errors no errors". `pnpm check` owns tsc.
                test: {
                    name: 'specs',
                    setupFiles: ['./test-setup.specs.ts'],
                },
            },
            {
                extends: true,
                optimizeDeps: {
                    include: [
                        'vite-plugin-node-polyfills/shims/buffer',
                        'vite-plugin-node-polyfills/shims/global',
                        'vite-plugin-node-polyfills/shims/process',
                        // Optimize both the renderer and its react-18 runtime up front; lazy mid-run discovery re-runs Vite's optimizer and 504s in-flight dynamic imports.
                        '@storybook/nextjs-vite',
                        'react-dom/client',
                        // Not hoisted to root; reach it via its parent workspace pkg so Vite can resolve and pre-bundle this CJS dep.
                        '@explorer/decoder-serum > @project-serum/serum',
                    ],
                },
                resolve: {
                    alias: {
                        'node-fetch': path.resolve(__dirname, '.storybook/node-fetch.browser-shim.ts'),
                    },
                },
                plugins: [
                    // The plugin will run tests for the stories defined in your Storybook config
                    // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
                    storybookTest({
                        configDir: path.join(dirname, '.storybook'),
                        tags: {
                            include: ['test'],
                            exclude: ['experimental'],
                        },
                    }),
                ],
                test: {
                    name: 'storybook',
                    // Default off — both race on the CI runner and drop dynamic imports; opt in locally via SB_ISOLATE / SB_PARALLEL for speed.
                    isolate: process.env.SB_ISOLATE === 'true',
                    fileParallelism: process.env.SB_PARALLEL === 'true',
                    browser: {
                        enabled: true,
                        headless: true,
                        // Default: chromium only. Opt into other Playwright browsers via
                        // `SB_BROWSERS=chromium,firefox pnpm test:sb` (firefox lacks CDP, so V8 coverage will fail).
                        instances: (process.env.SB_BROWSERS ?? 'chromium')
                            .split(',')
                            .map(b => b.trim())
                            .filter(Boolean)
                            .map(browser => ({ browser })),
                        provider: playwright(),
                        connectTimeout: 30000,
                    },
                    setupFiles: ['./test-setup.ts', './.storybook/vitest.setup.ts'],
                    testTimeout: 15000,
                    hookTimeout: 30000,
                    retry: 1,
                    sequence: {
                        concurrent: false,
                    },
                },
            },
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['app/**'],
            exclude: [
                'app/**/*.stories.*',
                'app/**/__stories__/**',
                'app/**/__mocks__/**',
                'app/**/__fixtures__/**',
                'app/**/__tests__/**',
                'app/**/__e2e__/**',
                'app/**/*.{test,spec}.{ts,tsx}',
                'app/**/*.d.ts',
            ],
        },
        ...specWorkspace(),
    },
});
