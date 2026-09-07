import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

// The entry script is excluded on purpose: it calls `main()` at module scope, so importing it would
// run the whole pipeline against live RPC and GitHub.
const PIPELINE_MODULES = [
    './scripts/feature-gates/lib/feature-store.ts',
    './scripts/feature-gates/lib/http.ts',
    './scripts/feature-gates/lib/merge.ts',
    './scripts/feature-gates/lib/rpc.ts',
    './scripts/feature-gates/lib/schedule.ts',
    './scripts/feature-gates/lib/simd-proposals.ts',
    './scripts/feature-gates/lib/simd-summary.ts',
];

/**
 * The cron runs the pipeline under plain `tsx`, where `server-only` and `client-only` resolve to a
 * bare `throw`. This suite cannot see that: `vite.config.mts` aliases both markers to a stub, so a
 * module that kills the cron on import still passes every spec. Load the graph in a child process to
 * get the resolution the cron gets.
 *
 * The eslint rule on `scripts/**` bans the `server.ts`/`client.ts` barrels that carry the marker by
 * convention; this catches the rest, including a marker added to a plain module the pipeline already
 * imports.
 */
describe('feature-gate pipeline module graph', () => {
    it('should load under plain Node, where the server-only marker throws', () => {
        // `tsx --eval` compiles to CJS, so no top-level await. A rejection has to exit non-zero
        // explicitly for `execFileSync` to see the failure.
        const imports = PIPELINE_MODULES.map(modulePath => `import('${modulePath}')`).join(', ');
        const program = `Promise.all([${imports}]).then(() => process.exit(0), error => { console.error(error); process.exit(1); })`;

        expect(() =>
            execFileSync('pnpm', ['exec', 'tsx', '--eval', program], {
                cwd: REPO_ROOT,
                encoding: 'utf8',
                stdio: 'pipe',
            }),
        ).not.toThrow();
    }, 120_000);
});
