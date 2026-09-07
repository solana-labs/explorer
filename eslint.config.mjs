import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import vitest from '@vitest/eslint-plugin';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import boundaries from 'eslint-plugin-boundaries';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import storybook from 'eslint-plugin-storybook';
import testingLibrary from 'eslint-plugin-testing-library';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TEST_AND_STORY_FILES = [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/__mocks__/**/*.[jt]s?(x)',
    '**/__fixtures__/**/*.[jt]s?(x)',
    '**/fixtures/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/*.stories.[jt]s?(x)',
];

// Flat config replaces `no-restricted-syntax` options wholesale, so every override must spread these
// back in or it silently drops the RegExp ban for its own files.
const NO_REGEXP_SELECTORS = [
    {
        selector: 'Literal[regex]',
        message:
            'RegExps are not recommended. If you sure regexp is needed - please use eslint-disable-next no-restricted-syntax -- %comment%  to explain why',
    },
    {
        selector: 'RegExpLiteral',
        message:
            'RegExps are not recommended. If you sure regexp is needed - please use eslint-disable-next no-restricted-syntax -- %comment%  to explain why',
    },
];

// `'use client'` turns the module into a client reference, which silently neutralises `client-only`:
// the pair reads as guarded while a server caller still fails at runtime instead of at build time.
const CLIENT_MARKER_CONFLICT = {
    selector:
        "Program:has(ExpressionStatement > Literal[value='use client']):has(ImportDeclaration[source.value='client-only'])",
    message:
        "Do not combine 'use client' with `import 'client-only'` — the directive makes the module a client reference, so the marker stops failing the build and a server caller degrades to a runtime error instead. Keep the directive for components; keep only the marker for hooks and plain modules.",
};

// Hooks still on `'use client'`. Per-file so any *new* hook is subject to the rule. This list only
// ever shrinks — a PR that adds an entry is opting a new hook out of the one guard that catches a
// server caller at build time. Removing an entry means swapping the directive for
// `import 'client-only'` and confirming `next build` still passes; a failure names a barrel that
// re-exports the hook onto a server path.
const HOOKS_PENDING_CLIENT_ONLY = [
    'app/entities/account/model/use-account-query.ts',
    'app/entities/cluster/model/use-cluster-connection-failed.ts',
    'app/entities/cluster/model/use-cluster-info.ts',
    'app/entities/cluster/model/use-cluster-modal.ts',
    'app/entities/cluster/model/use-cluster-resource-search.ts',
    'app/entities/cluster/model/use-cluster-url.ts',
    'app/entities/cluster/model/use-cluster.ts',
    'app/entities/cluster/model/use-solana-rpc.ts',
    'app/entities/domain/model/use-user-ans-domains.ts',
    'app/entities/domain/model/use-user-sns-domains.ts',
    'app/entities/idl/model/anchor/use-anchor-program.ts',
    'app/entities/idl/model/anchor/use-format-anchor-idl.ts',
    'app/entities/idl/model/use-format-codama-idl.ts',
    'app/entities/idl/model/use-program-idl-names.ts',
    'app/entities/idl/model/use-program-idls.ts',
    'app/entities/nft/model/use-token-metadata.ts',
    'app/entities/program-metadata/model/use-program-metadata-idl.tsx',
    'app/entities/slot-time/model/use-slot-time.ts',
    'app/entities/token-info/model/use-token-info.ts',
    'app/entities/transaction-data/model/use-resolved-instruction-names.ts',
    'app/features/cluster-switcher/model/use-cluster-href.ts',
    'app/features/cluster-switcher/model/use-custom-url-draft.ts',
    'app/features/cookie/model/use-analytics-consent.ts',
    'app/features/decode-account-pmp/model/use-decode-buffer-payload.ts',
    'app/features/decode-account-pmp/model/use-decode-metadata-payload.ts',
    'app/features/decode-account-pmp/model/use-resolve-buffer-config-from-bytes.ts',
    'app/features/decode-account-pmp/model/use-resolve-buffer-config-onchain.ts',
    'app/features/idl/interactive-idl/model/transaction/use-execute-transaction.ts',
    'app/features/idl/interactive-idl/model/transaction/use-simulate-transaction.ts',
    'app/features/idl/interactive-idl/model/use-instruction.ts',
    'app/features/idl/model/use-tabs.tsx',
    'app/features/instruction-simulation/model/use-simulation.ts',
    'app/features/nicknames/model/use-nickname.ts',
    'app/features/receipt/lib/use-primary-domain.ts',
    'app/features/stake/model/use-total-reward.ts',
    'app/features/supply/model/use-supply.ts',
    'app/features/token-batch/model/use-sub-instruction-mint-info.ts',
    'app/features/transaction-history/model/use-account-history.ts',
    'app/features/transaction-history/model/use-fetch-account-history.ts',
    'app/features/transaction/model/use-cluster-transaction-search.ts',
    'app/providers/wallet/use-logged-wallet-error.ts',
    'app/providers/wallet/use-wallet.ts',
    'app/shared/lib/use-auto-refresh.ts',
    'app/shared/lib/use-breakpoint.ts',
    'app/shared/lib/use-can-native-share.ts',
    'app/shared/lib/use-hydrated.ts',
    'app/shared/lib/use-reduced-motion.ts',
];

// A hook is never a component, so it never needs to *be* a client boundary — and `'use client'` costs
// it the only build-time guard available: a server caller of a directive-carrying module gets a
// client reference and fails at runtime, while `client-only` fails `next build` with an import trace.
const clientBoundaryPlugin = {
    rules: {
        'prefer-client-only-in-hooks': {
            create(context) {
                return {
                    Program(node) {
                        for (const statement of node.body) {
                            // Directives only count in the leading prologue, so stop at the first real statement.
                            if (statement.type !== 'ExpressionStatement' || statement.expression.type !== 'Literal') {
                                return;
                            }
                            if (statement.expression.value !== 'use client') continue;
                            context.report({
                                messageId: 'preferClientOnly',
                                node: statement,
                            });
                            return;
                        }
                    },
                };
            },
            meta: {
                docs: { description: "Suggest `import 'client-only'` over 'use client' for hook modules." },
                messages: {
                    preferClientOnly:
                        "Prefer `import 'client-only'` over 'use client' in a hook module: a server caller then fails `next build` with an import trace instead of throwing at runtime. Verify with a build — a failure means something in the server graph reaches this module, usually a barrel re-export worth splitting.",
                },
                schema: [],
                type: 'suggestion',
            },
        },
    },
};

export default tseslint.config(
    // Global ignores.
    // packages/* are intentionally not ignored: root `eslint .` (like prettier's `**/*.ts` glob) lints their source with this shared config — only built output is excluded.
    // Exception: packages/idl-decode, packages/entity-inspector and packages/parsers lint themselves with oxlint (see their .oxlintrc.json), wired into root `pnpm lint`.
    {
        ignores: [
            '**/dist/**',
            'packages/idl-decode/**',
            'lib/**',
            '.next/**',
            '.next-dev/**',
            'node_modules/**',
            '**/coverage/**',
            'playwright-report/**',
            'test-results/**',
            '.claude/**',
            '.worktrees/**',
            'packages/entity-inspector/**',
            'packages/parsers/**',
            'storybook-static/**',
            'storybook-static-*/**',
            'public/mockServiceWorker.js',
            'next-env.d.ts',
        ],
    },

    // Next.js flat config (eslint-config-next v16 ships native flat config)
    ...nextCoreWebVitals,

    // Base configs (after nextCoreWebVitals so tseslint parser takes precedence)
    ...tseslint.configs.recommended,

    // Storybook story-lint rules; self-scoped to story files + .storybook presets.
    ...storybook.configs['flat/recommended'],

    // Main config
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'warn',
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            'simple-import-sort': simpleImportSort,
            'sort-keys-fix': sortKeysFix,
            '@eslint-community/eslint-comments': eslintComments,
            unicorn,
        },
        rules: {
            semi: ['error', 'always'],
            '@typescript-eslint/no-explicit-any': 'error',
            'object-curly-spacing': ['error', 'always'],
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],
            'no-unused-vars': 'off',
            'simple-import-sort/imports': 'error',
            'no-restricted-globals': ['error', 'RegExp'],
            'no-restricted-syntax': ['error', ...NO_REGEXP_SELECTORS, CLIENT_MARKER_CONFLICT],
            'sort-keys-fix/sort-keys-fix': 'error',
            '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
            'no-console': 'error',
            'prefer-template': 'error',
            'unicorn/no-null': 'error',
            'import/no-default-export': 'error',
        },
    },

    // Allow require() in CommonJS and script files
    {
        files: ['**/*.cjs', '**/*.js'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },

    // `eslint-config-next` v16 scopes its `import` plugin to {js,jsx,mjs,ts,tsx,mts,cts}, not `.cjs`.
    // `.cjs` files are CommonJS (module.exports), so `import/no-default-export` doesn't apply — turn it
    // off there so the rule isn't referenced for files where the `import` plugin isn't registered.
    {
        files: ['**/*.cjs'],
        rules: {
            'import/no-default-export': 'off',
        },
    },

    // TODO: react-hooks rollout (introduced by the Next.js 16 upgrade). `eslint-config-next` v16
    // bundles `eslint-plugin-react-hooks` with the React Compiler-era rules below, which flag 225
    // pre-existing findings across the codebase. They are disabled here so the version bump stays
    // green and self-contained; re-enable and fix them incrementally (counts at time of upgrade):
    //   react-hooks/error-boundaries (143), react-hooks/refs (47), react-hooks/set-state-in-effect (26),
    //   react-hooks/purity (3), react-hooks/static-components (3),
    //   react-hooks/preserve-manual-memoization (2), react-hooks/immutability (1).
    {
        files: ['**/*.[jt]s?(x)'],
        rules: {
            'react-hooks/error-boundaries': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/static-components': 'off',
        },
    },

    // Testing library config for test files
    {
        files: TEST_AND_STORY_FILES,
        ...testingLibrary.configs['flat/react'],
    },

    // Vitest: enforce `it()` / `test()` titles start with "should"
    {
        files: TEST_AND_STORY_FILES,
        plugins: { vitest },
        rules: {
            'vitest/valid-title': [
                'error',
                {
                    // Allow `it.each` template titles like `'$scenario'` — the rule sees the literal
                    // template, not the resolved row value, so we accept any leading `$varname`.
                    mustMatch: { it: '^(should\\b|\\$)', test: '^(should\\b|\\$)' },
                },
            ],
        },
    },

    // TODO: `vitest/valid-title` cleanup. Each test file below has at least one `it()`/`test()` title
    // that doesn't start with "should" and is temporarily exempted so CI can stay green during the
    // gradual rollout. Per-file (not per-directory) so any *new* test file in these areas is still
    // subject to the rule. Remove a path once its titles have been migrated.
    {
        files: [
            'app/entities/idl/model/converters/type-handlers/leaf-tuple-type-handler.spec.ts',
            'app/entities/idl/model/converters/type-handlers/tuple-type-handlers.spec.ts',
        ],
        rules: {
            'vitest/valid-title': 'off',
        },
    },

    // Allow `null` in tests and Storybook stories — they mirror the component APIs they exercise
    {
        files: TEST_AND_STORY_FILES,
        rules: {
            'unicorn/no-null': 'off',
        },
    },

    // Allow unlimited disable in mock files
    {
        files: ['**/mocks/**/*.[jt]s?(x)'],
        rules: {
            '@eslint-community/eslint-comments/no-unlimited-disable': 'off',
        },
    },

    // Allow console in logger, scripts, standalone files
    {
        files: [
            'app/shared/lib/logger.ts',
            'packages/entity-inspector/src/logger.ts',
            'scripts/**',
            '**/*.mjs',
            '**/*.cjs',
        ],
        rules: {
            'no-console': 'off',
        },
    },

    // Relax sort-keys in config/tooling files (not linted by next lint before)
    {
        files: [
            '*.config.*',
            '**/*.mjs',
            '**/*.cjs',
            '.storybook/**',
            'storybook-design/.storybook/**',
            'scripts/**',
            '.prettierrc.cjs',
        ],
        rules: {
            'sort-keys-fix/sort-keys-fix': 'off',
        },
    },

    // TODO: `import/no-default-export` cleanup. Each path below has a legacy default export that
    // should be migrated to a named export. Per-file (not per-directory) so any *new* file in
    // these areas is still subject to the rule. Remove a path once its export is renamed.
    {
        files: [
            // app/components (pre-FSD legacy)
            'app/components/account/token-extensions/ScaledUiAmountMultiplierTooltip.tsx',
            'app/components/instruction/AnchorDetailsCard.tsx',
            'app/components/instruction/pyth/AddMappingDetailsCard.tsx',
            'app/components/instruction/pyth/AddPriceDetailsCard.tsx',
            'app/components/instruction/pyth/AddProductDetailsCard.tsx',
            'app/components/instruction/pyth/AggregatePriceDetailsCard.tsx',
            'app/components/instruction/pyth/BasePublisherOperationCard.tsx',
            'app/components/instruction/pyth/InitMappingDetailsCard.tsx',
            'app/components/instruction/pyth/InitPriceDetailsCard.tsx',
            'app/components/instruction/pyth/SetMinPublishersDetailsCard.tsx',
            'app/components/instruction/pyth/UpdatePriceDetailsCard.tsx',
            'app/components/instruction/pyth/UpdateProductDetailsCard.tsx',

            // app/providers (pre-FSD legacy)
            'app/providers/accounts/flagged-accounts.tsx',

            // app/utils (pre-FSD legacy)
            'app/utils/get-instruction-card-scroll-anchor-id.ts',
            'app/utils/get-readable-title-from-address.ts',
            'app/utils/use-tab-visibility.ts',

            // app/entities (FSD entities)
            'app/entities/nft/lib/get-edition-info.ts',
            'app/entities/nft/lib/is-metaplex-nft.ts',
            'app/entities/program-metadata/ui/program-name.tsx',

            // app/features (FSD features)
            'app/features/search/ui/SearchBar.tsx',
        ],
        rules: {
            'import/no-default-export': 'off',
        },
    },

    // Allow default exports where Next.js / Storybook / build tooling require them
    {
        files: [
            // Next.js App Router route files (server)
            'app/**/page.{ts,tsx,js,jsx}',
            'app/**/layout.{ts,tsx,js,jsx}',
            'app/**/error.{ts,tsx,js,jsx}',
            'app/**/loading.{ts,tsx,js,jsx}',
            'app/**/not-found.{ts,tsx,js,jsx}',
            'app/**/template.{ts,tsx,js,jsx}',
            'app/**/default.{ts,tsx,js,jsx}', // parallel-route default slot
            'app/**/global-error.{ts,tsx,js,jsx}',
            'app/**/forbidden.{ts,tsx,js,jsx}',
            'app/**/unauthorized.{ts,tsx,js,jsx}',

            // Project convention for the matching client component used by `page.tsx`
            'app/**/page-client.{ts,tsx}',

            // Next.js root files
            'next.config.*',
            'empty.ts', // Turbopack `resolveAlias` stub for Node built-ins (see next.config.mjs)
            'instrumentation.ts',
            'instrumentation-client.ts',
            'proxy.ts',
            'sentry.*.config.ts',

            // Storybook
            '.storybook/**',
            'storybook-design/.storybook/**',
            '**/*.stories.[jt]s?(x)',

            // Generic config files (including nested ones, e.g. packages/*/vitest.config.ts)
            '**/*.config.{ts,mts,js,mjs,cjs}',
        ],
        rules: {
            'import/no-default-export': 'off',
        },
    },

    // FSD layered import boundaries — feature → entity + shared; entity → shared;
    // same-layer cross-slice imports prohibited; cross-entity public API via `@x`.
    {
        files: ['app/**/*.[jt]s?(x)'],
        plugins: { boundaries },
        settings: {
            'boundaries/elements': [
                // Route handlers only. Pages are excluded on purpose: a server page may import a
                // client component to render it, which is the intended RSC pattern, while a handler
                // renders nothing and only ever calls what it imports.
                { type: 'route', pattern: 'app/**/route.[jt]s?(x)', mode: 'file' },
                { type: 'feature', pattern: 'app/features/*', mode: 'folder', capture: ['name'] },
                // Must precede the broader `entity` pattern — element types are matched in
                // declaration order, so `@x` folders would otherwise be classified as `entity`.
                {
                    type: 'entity-public-api',
                    pattern: 'app/entities/*/@x/*',
                    mode: 'folder',
                    capture: ['name', 'crossSlice'],
                },
                { type: 'entity', pattern: 'app/entities/*', mode: 'folder', capture: ['name'] },
                { type: 'shared', pattern: 'app/shared', mode: 'folder' },
            ],
        },
        rules: {
            'boundaries/dependencies': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        {
                            // Only through `server.ts` — that barrel exists to declare what a slice
                            // offers the server. `index.ts` is server-safe only by accident: add one
                            // client export to it later and a client boundary lands on a server call
                            // path silently. A deep path into `api/` or `lib/` drags in whatever that
                            // module happens to import, with the same result.
                            from: { type: 'route' },
                            allow: {
                                to: [
                                    { type: 'shared' },
                                    { type: 'entity', internalPath: 'server.ts' },
                                    { type: 'feature', internalPath: 'server.ts' },
                                ],
                            },
                        },
                        {
                            from: { type: 'feature' },
                            allow: {
                                to: [
                                    { type: 'shared' },
                                    { type: 'entity', internalPath: 'index.ts' },
                                    // Hooks an entity keeps off `index.ts` so that barrel stays callable
                                    // from a route handler; the `client-only` marker on it catches misuse.
                                    { type: 'entity', internalPath: 'client.ts' },
                                    { type: 'entity-public-api' },
                                    { type: 'feature', captured: { name: '{{ name }}' } },
                                ],
                            },
                        },
                        {
                            from: { type: 'entity' },
                            allow: {
                                to: [
                                    { type: 'shared' },
                                    { type: 'entity-public-api' },
                                    { type: 'entity', captured: { name: '{{ name }}' } },
                                ],
                            },
                        },
                        {
                            // `@x` re-export files reach back into their own entity's internals.
                            from: { type: 'entity-public-api' },
                            allow: {
                                to: [{ type: 'shared' }, { type: 'entity', captured: { name: '{{ name }}' } }],
                            },
                        },
                        {
                            from: { type: 'shared' },
                            allow: {
                                to: { type: 'shared' },
                            },
                        },
                    ],
                },
            ],
        },
    },

    // Allow cross-boundary imports in tests and Storybook stories.
    {
        files: TEST_AND_STORY_FILES,
        rules: {
            'boundaries/dependencies': 'off',
        },
    },

    // A slice's data-access layer is shared by both graphs: route handlers call it on the server,
    // components call it in the browser. `'use client'` here compiles fine and then throws
    // "is on the client" the first time a server caller invokes it. Put the boundary on the hook or
    // component that consumes the module instead.
    {
        files: [
            'app/entities/*/api/**/*.[jt]s?(x)',
            'app/entities/*/@x/**/*.[jt]s?(x)',
            'app/features/*/api/**/*.[jt]s?(x)',
        ],
        ignores: TEST_AND_STORY_FILES,
        rules: {
            'no-restricted-syntax': [
                'error',
                ...NO_REGEXP_SELECTORS,
                CLIENT_MARKER_CONFLICT,
                {
                    selector: "ExpressionStatement > Literal[value='use client']",
                    message:
                        "Do not mark a slice's api/ or @x/ module 'use client' — server code imports it, and the directive turns those calls into a client-reference error at runtime. Move the boundary to the consuming hook or component.",
                },
            ],
        },
    },

    // Deliberately its own rule name: configuring `no-restricted-syntax` here would replace the
    // error-level selectors for these files and silently downgrade them.
    {
        files: ['app/**/use-*.[jt]s?(x)'],
        ignores: [...TEST_AND_STORY_FILES, ...HOOKS_PENDING_CLIENT_ONLY],
        plugins: { boundary: clientBoundaryPlugin },
        rules: {
            'boundary/prefer-client-only-in-hooks': 'error',
        },
    },

    // A `server.ts` barrel declares which exports are for server consumers; without the marker that
    // declaration is unenforced, and a client importer is only found at runtime. Universal code stays
    // reachable through the slice's `index.ts`.
    {
        files: ['app/**/server.[jt]s?(x)'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...NO_REGEXP_SELECTORS,
                CLIENT_MARKER_CONFLICT,
                {
                    selector: "Program:not(:has(ImportDeclaration[source.value='server-only']))",
                    message:
                        "A `server.ts` barrel must `import 'server-only'` so a client importer fails `next build` instead of at runtime.",
                },
            ],
        },
    },

    // TODO: `boundaries/dependencies` cleanup. Each path below crosses an FSD boundary
    // (cross-feature, cross-entity without `@x`, reverse-layer, or deep import bypassing the
    // barrel). Per-file so any *new* file in these areas is still subject to the rule. Remove a
    // path once the import is migrated (route through the barrel, use `@x`, or relocate shared
    // logic to `shared/`).
    {
        files: [
            // app/entities cross-entity / wrong-direction imports
            'app/entities/nft/lib/get-metadata-json.ts',

            // app/features cross-feature imports
            'app/features/idl/interactive-idl/model/use-mainnet-confirmation.ts',
            'app/features/instruction-simulation/ui/SimulationCard.tsx',
            'app/features/receipt/receipt-page.tsx',
            'app/features/search/api/discover-with-utl.ts',
            'app/features/search/api/resolve-search-tokens.ts',
            'app/features/stake/ui/StakeAccountSection.tsx',
            'app/features/transaction/ui/AccountDetailSlideover.tsx',
            'app/features/transaction/ui/AccountExpandedSections.tsx',
            'app/features/transaction/ui/InstructionsSection.tsx',
            'app/features/transaction/ui/SummaryCard.tsx',
            'app/features/vote/ui/VoteAccountSection.tsx',

            // app/features deep imports into entities (must go via barrel)
            'app/features/idl/interactive-idl/model/codama/codama-interpreter.ts',

            // app/shared reverse-layer imports
            'app/shared/components/DownloadDropdown.tsx',
        ],
        rules: {
            'boundaries/dependencies': 'off',
        },
    },

    // - Restrict @sentry/nextjs imports in app code
    // - Disable Jest — this project uses Vitest
    {
        files: ['app/**/*.[jt]s?(x)'],
        ignores: ['app/shared/lib/sentry/**', 'app/shared/lib/logger.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@sentry/nextjs',
                            message:
                                "Import from '@/app/shared/lib/sentry' instead. For logging, use the Logger from '@/app/shared/lib/logger'.",
                        },
                        {
                            name: 'jest',
                            message: 'This project uses Vitest. Import from `vitest` instead.',
                        },
                    ],
                    patterns: [
                        {
                            group: ['@jest/*'],
                            message: 'This project uses Vitest. Import from `vitest` instead.',
                        },
                    ],
                },
            ],
        },
    },

    // `scripts/**` runs as a plain Node process, where a slice's `server.ts` / `client.ts` barrel is
    // the wrong door: the `server-only` / `client-only` marker on it resolves to its throwing
    // `default` export outside Next's build, so the script dies on import. No green gate catches it —
    // vite aliases both markers to a stub, so the specs pass and the cron is where it surfaces.
    {
        files: ['scripts/**/*.[jt]s?(x)'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '**/app/**/server',
                                '**/app/**/server.ts',
                                '**/app/**/client',
                                '**/app/**/client.ts',
                            ],
                            message:
                                "A slice's `server.ts`/`client.ts` barrel carries a `server-only`/`client-only` marker that throws outside Next's build. Import the module that owns the export instead.",
                        },
                    ],
                },
            ],
        },
    },

    // Allow type assertions in tests, mocks, fixtures, and Storybook stories — they routinely fake
    // partial shapes to exercise component/module surfaces and shouldn't be held to the production
    // typecast prohibition.
    {
        files: TEST_AND_STORY_FILES,
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'off',
        },
    },

    // Allow type-import flexibility in tests, mocks, fixtures, and Storybook stories — they often
    // use dynamic mock shapes and shouldn't be forced into static `import type` form.
    {
        files: TEST_AND_STORY_FILES,
        rules: {
            '@typescript-eslint/consistent-type-imports': 'off',
        },
    },

    // TODO: `@typescript-eslint/consistent-type-imports` cleanup. Each app/<name>/** below has
    // existing imports missing the `type` keyword and is temporarily exempted so CI can stay green
    // during the gradual rollout. Run `eslint --fix` per-directory to migrate and remove the entry.
    {
        files: [
            'app/address/**/*.[jt]s?(x)',
            'app/api/**/*.[jt]s?(x)',
            'app/block/**/*.[jt]s?(x)',
            'app/components/**/*.[jt]s?(x)',
            'app/entities/**/*.[jt]s?(x)',
            'app/epoch/**/*.[jt]s?(x)',
            'app/feature-gates/**/*.[jt]s?(x)',
            'app/features/**/*.[jt]s?(x)',
            'app/og/**/*.[jt]s?(x)',
            'app/providers/**/*.[jt]s?(x)',
            'app/shared/**/*.[jt]s?(x)',
            'app/tos/**/*.[jt]s?(x)',
            'app/tx/**/*.[jt]s?(x)',
            'app/utils/**/*.[jt]s?(x)',
            'app/validators/**/*.[jt]s?(x)',
        ],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'off',
        },
    },

    // TODO: `@typescript-eslint/consistent-type-assertions` cleanup. Each app/<name>/** below has
    // existing `as X` casts and is temporarily exempted so CI can stay green during the gradual
    // rollout. Per-directory (not per-file) for now; tighten to per-file or remove a path once its
    // casts have been migrated (or justified with an inline disable + comment).
    {
        files: [
            'app/address/**/*.[jt]s?(x)',
            'app/api/**/*.[jt]s?(x)',
            'app/components/**/*.[jt]s?(x)',
            'app/entities/**/*.[jt]s?(x)',
            'app/feature-gates/**/*.[jt]s?(x)',
            'app/features/**/*.[jt]s?(x)',
            'app/providers/**/*.[jt]s?(x)',
            'app/shared/**/*.[jt]s?(x)',
            'app/tx/**/*.[jt]s?(x)',
            'app/utils/**/*.[jt]s?(x)',
        ],
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'off',
        },
    },

    // TODO: `unicorn/no-null` cleanup. Each path below has at least one `null` literal flagged by
    // the rule and is temporarily exempted so CI can stay green during the gradual rollout. The list
    // is intentionally per-file (not per-directory) so any *new* file in these areas is still
    // subject to the rule. Remove a path from the list once its `null` usages have been migrated
    // to `undefined` (or justified with an inline `eslint-disable-next-line unicorn/no-null`).
    {
        files: [
            // app root & route pages (pre-FSD)
            'app/@analytics/default.js',
            'app/layout.tsx',
            'app/address/[[]address[]]/layout.tsx',
            'app/block/[[]slot[]]/accounts/page-client.tsx',
            'app/block/[[]slot[]]/page-client.tsx',
            'app/block/[[]slot[]]/programs/page-client.tsx',
            'app/block/[[]slot[]]/rewards/page-client.tsx',
            'app/tx/[[]signature[]]/page-client.tsx',

            // app/api (Next route handlers)
            'app/api/domain-info/[[]domain[]]/route.ts',
            'app/api/metadata/proxy/route.ts',
            'app/api/token-price/[[]mintAddress[]]/route.ts',
            'app/api/search/route.ts',

            // app/components (pre-FSD legacy — to be migrated into features/entities)
            'app/components/LiveTransactionStatsCard.tsx',
            'app/components/MessageBanner.tsx',
            'app/components/account/AnchorAccountCard.tsx',
            'app/components/account/CompressedNftCard.tsx',
            'app/components/account/FeatureAccountSection.tsx',
            'app/components/account/MetaplexNFTHeader.tsx',
            'app/components/account/OwnedTokensCard.tsx',
            'app/components/account/ProgramMultisigCard.tsx',
            'app/components/account/RewardsCard.tsx',
            'app/components/account/TokenAccountSection.tsx',
            'app/components/account/TokenExtensionsSection.tsx',
            'app/components/account/TokenHistoryCard.tsx',
            'app/components/account/UpgradeableLoaderAccountSection.tsx',
            'app/components/account/VerifiedBuildCard.tsx',
            'app/components/account/history/TokenInstructionsCard.tsx',
            'app/components/account/history/TokenTransfersCard.tsx',
            'app/components/account/nftoken/isNFTokenAccount.ts',
            'app/components/account/nftoken/nftoken.ts',
            'app/components/account/sas/AttestationDataCard.tsx',
            'app/components/account/sas/SolanaAttestationCard.tsx',
            'app/components/account/token-extensions/ScaledUiAmountMultiplierTooltip.tsx',
            'app/components/block/BlockHistoryCard.tsx',
            'app/components/block/BlockRewardsCard.tsx',
            'app/components/common/BaseInstructionCard.tsx',
            'app/components/common/BaseRawParsedDetails.tsx',
            'app/components/common/Copyable.tsx',
            'app/components/common/InfoTooltip.tsx',
            'app/components/common/InspectorInstructionCard.tsx',
            'app/components/common/NFTArt.tsx',
            'app/components/common/TableCardBody.tsx',
            'app/components/common/TimestampToggle.tsx',
            'app/components/inspector/AccountsCard.tsx',
            'app/components/inspector/AddressTableLookupsCard.tsx',
            'app/components/inspector/AddressWithContext.tsx',
            'app/components/inspector/InstructionsSection.tsx',
            'app/components/instruction/AnchorDetailsCard.tsx',
            'app/components/instruction/ProgramEventsCard.tsx',
            'app/components/instruction/codama/CodamaInstructionDetailsCard.tsx',
            'app/components/instruction/codama/codamaUtils.tsx',
            'app/components/instruction/ed25519/Ed25519DetailsCard.tsx',
            'app/components/instruction/program-metadata-idl/ProgramMetadataIdlInstructionDetailsCard.tsx',
            'app/components/instruction/pyth/UpdateProductDetailsCard.tsx',
            'app/components/instruction/token/TokenDetailsCard.tsx',
            'app/components/shared/StatusBadge.tsx',
            'app/components/shared/account/ProgramHeader.tsx',
            'app/components/shared/ui/autocomplete.tsx',

            // app/providers (pre-FSD legacy)
            'app/providers/accounts/rewards.tsx',
            'app/providers/compressed-nft.tsx',
            'app/providers/epoch.tsx',
            'app/providers/squadsMultisig.tsx',
            'app/providers/stats/solanaClusterStats.tsx',
            'app/providers/stats/solanaPerformanceInfo.tsx',
            'app/providers/transactions/index.tsx',
            'app/providers/transactions/raw.tsx',

            // app/utils (pre-FSD legacy)
            'app/utils/anchor.tsx',
            'app/utils/attestation-service.tsx',
            'app/utils/cluster.ts',
            'app/utils/get-readable-title-from-address.ts',
            'app/utils/parseFeatureAccount.ts',
            'app/utils/program-logs.ts',
            'app/utils/program-verification.tsx',
            'app/utils/verified-builds.tsx',

            // app/shared (FSD shared)
            'app/shared/lib/triggerDownload.ts',
            'app/shared/lib/visibility.tsx',
            'app/shared/ui/navigation-tabs/ui/NavigationTabLink.tsx',

            // app/entities (FSD entities)
            'app/entities/account/model/use-accounts-info.ts',
            'app/entities/compute-unit/lib/compute-units-schedule.ts',
            'app/entities/digital-asset/api.ts',
            'app/entities/domain/api/fetch-ans-domains.ts',
            'app/entities/domain/api/resolve-domain.ts',
            'app/entities/domain/model/use-user-ans-domains.ts',
            'app/entities/domain/model/use-user-sns-domains.ts',
            'app/entities/domain/ui/BaseDomainsCard.tsx',
            'app/entities/idl/model/anchor/use-anchor-program.ts',
            'app/entities/idl/model/anchor/use-format-anchor-idl.ts',
            'app/entities/idl/model/converters/type-handlers/tuple-type-handlers.ts',
            'app/entities/idl/model/idl-version.ts',
            'app/entities/idl/model/use-format-codama-idl.ts',
            'app/entities/nft/lib/is-metaplex-nft.ts',
            'app/entities/token-info/model/token-info-batch-provider.tsx',
            'app/entities/token-info/model/use-token-info.ts',
            'app/entities/token-price/lib/parse-usd.ts',
            'app/entities/token-price/model/use-token-price.ts',

            // app/features (FSD features)
            'app/features/account/ui/AccountDownloadDropdown.tsx',
            'app/features/cookie/lib/cookie.ts',
            'app/features/cookie/model/use-analytics-consent.ts',
            'app/features/cookie/ui/CookieConsent.tsx',
            'app/features/idl/formatted-idl/model/search.ts',
            'app/features/idl/formatted-idl/ui/BaseFormattedIdl.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlAccounts.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlConstants.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlDoc.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlErrors.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlEvents.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlFields.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlInstructions.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlPdas.tsx',
            'app/features/idl/formatted-idl/ui/BaseIdlTypes.tsx',
            'app/features/idl/formatted-idl/ui/SearchHighlightContext.tsx',
            'app/features/idl/interactive-idl/model/anchor/anchor-interpreter.ts',
            'app/features/idl/interactive-idl/model/codama/codama-interpreter.ts',
            'app/features/idl/interactive-idl/model/codama/codama-program.ts',
            'app/features/idl/interactive-idl/model/codama/convert-value.ts',
            'app/features/idl/interactive-idl/model/idl-executor.ts',
            'app/features/idl/interactive-idl/model/pda-generator/anchor-provider.ts',
            'app/features/idl/interactive-idl/model/pda-generator/codama-provider.ts',
            'app/features/idl/interactive-idl/model/pda-generator/program-resolver.ts',
            'app/features/idl/interactive-idl/model/pda-generator/registry.ts',
            'app/features/idl/interactive-idl/model/pda-generator/seed-builder.ts',
            'app/features/idl/interactive-idl/model/state-atoms.ts',
            'app/features/idl/interactive-idl/model/use-mainnet-confirmation.ts',
            'app/features/idl/interactive-idl/ui/ArgumentInput.tsx',
            'app/features/idl/interactive-idl/ui/BaseConnectWalletButton.tsx',
            'app/features/idl/interactive-idl/ui/InteractWithIdl.tsx',
            'app/features/idl/ui/IdlRenderer.tsx',
            'app/features/idl/ui/IdlSection.tsx',
            'app/features/metadata/mocks.ts',
            'app/features/metadata/model/useOffChainMetadata.ts',
            'app/features/mpl-token-metadata/ui/MetaplexTokenMetadataDetailsCard.tsx',
            'app/features/nicknames/lib/nicknames.ts',
            'app/features/nicknames/model/use-nickname.ts',
            'app/features/receipt/__e2e__/receipt.e2e.ts',
            'app/features/receipt/lib/generate-receipt-csv.ts',
            'app/features/receipt/lib/use-primary-domain.ts',
            'app/features/receipt/mocks/custom-fee-payer.ts',
            'app/features/receipt/mocks/jito-only-transfer.ts',
            'app/features/receipt/mocks/mixed-mint-transfers.ts',
            'app/features/receipt/mocks/multiple-transfers.ts',
            'app/features/receipt/mocks/no-transfers.ts',
            'app/features/receipt/mocks/single-transfer.ts',
            'app/features/receipt/mocks/token-2022-transfer.ts',
            'app/features/receipt/mocks/token-2022-transfer2.ts',
            'app/features/receipt/mocks/usdc-checked-transfer.ts',
            'app/features/receipt/mocks/usdc-fp-precision-transfers.ts',
            'app/features/receipt/mocks/usdc-jito-transfer.ts',
            'app/features/receipt/mocks/usdc-multiple-transfers.ts',
            'app/features/receipt/mocks/usdc-multisig-transfer.ts',
            'app/features/receipt/mocks/usdc-regular-transfer.ts',
            'app/features/receipt/mocks/zero-transfer.ts',
            'app/features/receipt/receipt-page.tsx',
            'app/features/receipt/ui/BaseReceiptImage.tsx',
            'app/features/receipt/ui/ViewReceiptButton.tsx',
            'app/features/search/lib/filter-tabs.ts',
            'app/features/search/model/use-search.ts',
            'app/features/search/ui/BaseSearch.tsx',
            'app/features/security-txt/ui/SecurityCard.tsx',
            'app/features/security-txt/ui/SecurityNotification.tsx',
            'app/features/security-txt/ui/common.tsx',
            'app/features/security-txt/ui/utils.ts',
            'app/features/stake/lib/stake-activation-math.ts',
            'app/features/stake/ui/StakeAccountSection.tsx',
            'app/features/token-verification-badge/model/use-bluprynt.ts',
            'app/features/token-verification-badge/model/use-jupiter.ts',
            'app/features/token-verification-badge/model/use-rugcheck.ts',
            'app/features/token-verification-badge/ui/VerificationIcon.tsx',
            'app/features/transaction-history/ui/TransactionHistoryCard.tsx',
            'app/features/transaction/ui/AccountsCard.tsx',
            'app/features/transaction/ui/ProgramLogSection.tsx',
            'app/features/transaction/ui/TokenBalancesCard.tsx',
        ],
        rules: {
            'unicorn/no-null': 'off',
        },
    },

    // Allow `any` in tests, mocks, fixtures, and Storybook stories — they routinely fake partial
    // shapes to exercise component/module surfaces and shouldn't be held to the production
    // no-explicit-any prohibition.
    {
        files: TEST_AND_STORY_FILES,
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },

    // TODO: `@typescript-eslint/no-explicit-any` cleanup. Each path below has at least one `any`
    // type annotation flagged by the rule and is temporarily exempted so CI can stay green during
    // the gradual rollout. The list is intentionally per-file (not per-directory) so any *new* file
    // in these areas is still subject to the rule. Remove a path from the list once its `any`
    // usages have been replaced with `unknown` (and narrowed) or a proper type.
    {
        files: [
            // app/components (pre-FSD legacy)
            'app/components/ProgramLogsCardBody.tsx',
            'app/components/account/AccountHeader.tsx',
            'app/components/account/AnchorAccountCard.tsx',
            'app/components/account/MetaplexNFTAttributesCard.tsx',
            'app/components/account/nftoken/nftoken-hooks.tsx',
            'app/components/account/nftoken/nftoken-types.ts',
            'app/components/account/sas/AttestationDataCard.tsx',
            'app/components/common/BaseInstructionCard.tsx',
            'app/components/common/InspectorInstructionCard.tsx',
            'app/components/inspector/InstructionsSection.tsx',
            'app/components/instruction/AnchorDetailsCard.tsx',
            'app/components/instruction/ProgramEventsCard.tsx',
            'app/components/instruction/bpf-upgradeable-loader/BpfUpgradeableLoaderDetailsCard.tsx',
            'app/components/instruction/codama/codamaUtils.tsx',
            'app/components/instruction/program-metadata-idl/ProgramMetadataIdlInstructionDetailsCard.tsx',
            'app/components/instruction/pyth/program.ts',
            'app/components/instruction/sas/SolanaAttestationDetailsCard.tsx',
            'app/components/instruction/token/TokenDetailsCard.tsx',

            // app/providers (pre-FSD legacy)
            'app/providers/accounts/index.tsx',
            'app/providers/squadsMultisig.tsx',

            // app/utils (pre-FSD legacy)
            'app/utils/anchor.tsx',
            'app/utils/attestation-service.tsx',
            'app/utils/program-err.ts',
            'app/utils/tx.ts',
            'app/utils/verified-builds.tsx',

            // app/entities (FSD entities)
            'app/entities/idl/lib/utils.ts',
            'app/entities/idl/model/anchor/use-format-anchor-idl.ts',
            'app/entities/idl/model/converters/convert-display-idl.ts',
            'app/entities/idl/model/converters/convert-legacy-idl.ts',
            'app/entities/idl/model/converters/type-handlers/leaf-tuple-type-handler.ts',
            'app/entities/idl/model/formatters/format.ts',
            'app/entities/idl/model/formatters/formatted-idl.d.ts',
            'app/entities/nft/lib/get-metadata-json.ts',

            // app/features (FSD features)
            'app/features/idl/interactive-idl/model/anchor/anchor-interpreter.ts',
            'app/features/idl/interactive-idl/model/anchor/anchor-program.ts',
            'app/features/idl/interactive-idl/model/anchor/array-parser.ts',
            'app/features/idl/interactive-idl/model/unified-program.d.ts',
            'app/features/security-txt/ui/PmpSecurityTxtTable.tsx',
            'app/features/security-txt/ui/SecurityCard.tsx',
            'app/features/security-txt/ui/common.tsx',
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },

    // A vi.mock factory in the specs setup file must be self-contained: it runs while `@solana/kit` is
    // still resolving, so dynamically importing app code from inside one makes the factory wait on a
    // module that is waiting on the factory, and the whole specs project deadlocks with no error and no
    // timeout. Static imports are fine — they finish before any factory runs.
    {
        files: ['test-setup.specs.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...NO_REGEXP_SELECTORS,
                CLIENT_MARKER_CONFLICT,
                {
                    selector: 'ImportExpression',
                    message:
                        'Do not use dynamic import() in this file. A vi.mock factory that imports app code deadlocks the specs project with no error and no timeout. Import statically at the top of the file instead.',
                },
            ],
        },
    },
);
