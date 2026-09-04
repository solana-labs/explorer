# Project Conventions

*Bullets without a prefix are mandatory; `Recommended:` / `Preferred:` mark soft guidance.*

## Principles

- Start with the simplest solution that works. Add complexity only when there is a proven need — not because something "might" be useful.

## Architecture
**Applies to:** `app/**`

- Follow Feature-Sliced Design (FSD): features in `app/features/`, entities in `app/entities/`, shared code in `app/shared/`.
  - Server-only code within a slice lives in a dedicated `server.ts` file at the slice root, separate from client code.
- Prefer functional style. Use classes only to scope domain-specific logic (e.g., IDL interpreters, program executors).

## Code Style
**Applies to:** `app/**/*.{ts,tsx,mts,mjs,cjs,js}`

- Recommended: organize files top-down — exported/public API at the top, auxiliary helpers toward the bottom.
- Use path aliases (`@entities/`, `@features/`, `@shared/`, `@utils/`, `@providers/`, `@validators/`) over relative imports.
- Use object destructuring for function parameters when there are 3+ arguments or 2+ optional arguments.
- Recommended: argument ordering — stable/context arguments first (cluster, connection, config), data arguments in the middle, arguments with default values last.

## Comments
**Applies to:** `app/**/*.{ts,tsx}`

- Add a clarification comment when a decision might look wrong or surprising to a future reader (e.g. using an index key when a natural key exists, choosing a seemingly suboptimal approach for a non-obvious reason). Explain why, not what.

## Frontend
**Applies to:** `app/**/*.tsx`

- Use `class-variance-authority` (CVA) for component variants — not conditional class logic or CSS overrides.
- Recommended: name stateless, hook-free UI components with a `Base` prefix (e.g., `BaseSearch`, `BaseTransactionCard`). When using the `Base` prefix, pair the component with a Storybook story.

## Storybook
**Applies to:** `**/*.stories.{ts,tsx}`

- Do not use unnecessary decorators. Do not create wrappers that aren't used in the app.
- Infer story args from the component signature — do not remap props.
- Do not use `centered` layout — real component edges must be visible.

## Libraries
**Applies to:** `app/**/*.{ts,tsx}`

- Use `superstruct` for runtime validation of external data (API responses, URL params, user input).
- Use the `Logger` abstraction (`Logger.error`, `Logger.warn`, `Logger.info`) instead of direct Sentry imports. Import Sentry utilities from `@/app/shared/lib/sentry`, not from `@sentry/nextjs`.
- Preferred: use `@solana/kit` for new functionality and when refactoring existing code.

## Testing
**Applies to:** `app/features/**`, `app/entities/**`, `app/shared/**`

- Cover features, entities, and shared modules with unit tests when adding or modifying code.

## CI

- The CI pipeline runs `pnpm format:ci` → `pnpm lint` → `pnpm openspec:validate` → `pnpm build` → `pnpm test:ci`. These checks are mandatory — fix violations, never bypass them (no `--no-verify`, no skipping, no disabling rules to silence output). The local hooks below are a developer convenience to surface failures before push; the checks themselves are not optional. Enable with `git config core.hooksPath .githooks`:
  - `pre-commit` — runs `pretty:format`, `eslint:lint`, and `test:changed` scoped to staged files.
  - `pre-push` — runs the full pipeline (format, lint, openspec:validate, build, test).
- Optionally, use [`act`](https://github.com/nektos/act) to run GitHub Actions workflows locally before pushing.
- [`bench/BUILD.md`](bench/BUILD.md) is the committed route-size snapshot. Any PR that changes client bundle sizes must refresh it with `pnpm build:info` and commit the result — the `Build-Info` CI job fails when the committed table drifts from the fresh build by more than one rounding step.

## Design Decisions (OpenSpec)

Non-trivial design and architectural choices are captured as **OpenSpec change proposals** under `openspec/changes/<change-id>/proposal.md`. `proposal.md` is the only required artifact; specs/tasks/design are optional per-change. See [`openspec/README.md`](openspec/README.md) for the convention and [`openspec/changes/pick-adr-methodology/proposal.md`](openspec/changes/pick-adr-methodology/proposal.md) for the rationale. Validate with `openspec validate <change-id> --type change --strict`.

## PR Authoring

- When opening a PR via `gh pr create --body`, fill the body from [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — the `--body` flag bypasses the template that GitHub's web UI auto-loads.

## PR Review

When reviewing a pull request, agents are encouraged to launch their available review tooling and surface findings to the contributor. Scope reviews to the PR's changed files unless instructed otherwise. Findings are advisory — the contributor decides whether and how to act on them. We do suggest addressing the most destructive findings (bugs, security issues, data-loss risks) before merging.

Recommended: check whether the PR's changed files appear in any per-file ignore block (like `eslint.config.mjs`). For overlapping files, suggest fixing existing violations and removing the file from the ignore list — opportunistic cleanup, not a blocker. Flag any *new* violations added in the same file: the ignore list exempts existing code, not new additions.

Recommended: watch bundle-size movement. A PR's bundle effect shows in its `bench/BUILD.md` diff and in the sticky "Bundle change" comment posted by CI. *Flag:* notable First Load JS growth (tens of kB on existing routes, or a new route far above its peers) that the PR description does not justify; `bench/BUILD.md` edits that look hand-tuned rather than generated by `pnpm build:info`. *Do NOT flag:* one-rounding-step (10 kB) movements — they are display noise.

Recommended: when the diff includes files under `openspec/`, focus on **semantic quality** of the rationale — CI already covers well-formedness via `pnpm openspec:validate`. *Flag:* `## Why` sections that don't list alternatives or the trade-off; requirement scenarios too vague to fail when violated; proposals re-asking a question settled by an earlier change. *Do NOT flag:* missing proposals on code-only PRs (*non-trivial* is the author's judgement call, not an automated gate); absence of optional artifacts (`tasks.md`, `design.md`, secondary specs); proposals lacking tests or implementation detail (proposals capture rationale, not feature specs).

---

## Adoption

Tools wired up to read these rules:
- **Claude Code** — reads `AGENTS.md` at project root alongside `CLAUDE.md`
- **Greptile** — auto-indexes `AGENTS.md` for PR reviews
- **Codex (OpenAI)** — reads `AGENTS.md` at project root
- **Cursor** — reads `AGENTS.md` at project root
- **Zed** — reads `AGENTS.md` at project root
- **opencode** — reads `AGENTS.md` at project root
- **GitHub Copilot** — reads `.github/copilot-instructions.md`, symlinked to `AGENTS.md`
