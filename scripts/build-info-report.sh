#!/usr/bin/env bash
set -euo pipefail

# Renders the bundle-change report exactly as CI's Build-Info job does.
#
# Usage:
#   scripts/build-info-report.sh [base-ref] [fresh-table]
#
# Prerequisite: a fresh route table, e.g. `pnpm build:info .next/BUILD.fresh.md`.
# Output: .next/bundle-report.md (also printed to stdout).

base_ref="${1:-master}"
fresh="${2:-.next/BUILD.fresh.md}"

if [[ ! -f "$fresh" ]]; then
    echo "❌ $fresh not found — run \`pnpm build:info $fresh\` first." >&2
    exit 1
fi

git fetch --depth=1 origin "$base_ref"
git show FETCH_HEAD:bench/BUILD.md > .next/BUILD.base.md

# Plain `diff` (not `git diff`) so local git diff-tool config can never leak into the report;
# it exits 1 whenever the files differ, hence the `|| true`.
diff -U0 .next/BUILD.base.md "$fresh" > .next/BUILD.diff || true

pnpm exec tsx scripts/build-info-diff.ts report .next/BUILD.base.md "$fresh" "$base_ref" .next/BUILD.diff bench/BUILD.md > .next/bundle-report.md
cat .next/bundle-report.md
