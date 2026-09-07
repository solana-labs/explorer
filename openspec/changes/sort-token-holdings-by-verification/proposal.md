# Proposal: Order token holdings by verification status

## Context

Address pages list every SPL and Token-2022 holding an account owns. Since #1181 lifted the 100-token cap, `TokensProvider` (`app/providers/accounts/tokens.tsx:66-82`) fetches every token account and `OwnedTokensCard` renders them in RPC return order, which is arbitrary. Measured against the accounts named in the issue:

| Address  | Token accounts |
| -------- | -------------- |
| `86xCn…` | 1051           |
| `MJKqp…` | 520            |
| `8BseX…` | 183            |

For `86xCn…` the 1051 accounts map to 1051 distinct mints. The unified token list (UTL) knows 171 of them and marks 78 as `verified`. The other 880 are unknown to it. A user's real holdings sit scattered among roughly a thousand airdropped tokens, so the first screen of 20 rows is effectively random.

Metadata reaches the card lazily, one visible row at a time: `TokenRow` calls `useTokenInfo`, which coalesces into a batched POST through `TokenInfoBatchProvider`. The `verified` flag therefore does not exist for a token until its row has already rendered, so the list cannot be ordered by it.

## Why

The objection raised on the issue is that every holding is equally valid on-chain, so nothing distinguishes relevant from irrelevant. That is correct, and it rules out the cheap filters. Each was measured rather than assumed:

- **Zero balances.** 5 accounts of 1051. Junk tokens carry nonzero balances, so an amount filter removes nothing.
- **Metadata existence.** Jupiter's token API resolves a name and symbol for 74 of 100 sampled mints, none of them verified. Junk tokens have metadata, so its presence does not discriminate.
- **Balance ordering.** Meaningless across differing decimals. Ordering by value needs prices for ~1000 mints, and `/api/token-price` resolves one mint per request.

What remains is the curated off-chain registry the Explorer already consumes. UTL's `verified` field is populated and discriminating — 78 of 1051 on the worst example. Ordering rather than filtering keeps every holding reachable, so the Explorer reports a fact from a named source instead of deciding which of a user's tokens deserve to exist.

Alternatives considered:

- **Hide unverified tokens behind a filter.** Rejected for now. It hides real holdings by default, and it costs a control, a URL parameter and an empty state. The tiered order meets the goal — surface the relevant tokens first — without removing anything, and a filter can be layered on later.
- **Resolve and sort holdings server-side, returning one page.** Rejected as a separate concern. It would cut the client download from ~102 KB to ~5 KB, but it targets the RPC payload, not the sort. `serverClusterUrl` excludes `Cluster.Custom` by construction (see `keep-custom-url-off-our-server`), so a client path must survive for local validators — a permanent second implementation. `TokenHistoryCard` shares the same provider, Load More becomes a round trip, and refresh moves to route invalidation. That is its own change.
- **Download the verified universe once and intersect on the client.** Rejected on measurement. `GET /v1/list?chainId=101` returns only verified tokens: 10,115 entries, 3.1 MB, 5.9 s. Reduced to bare addresses it is 483 KB, or 327 KB gzipped, or 81 KB as an 8-byte truncated hash set with no collisions across the 10,115. That beats 17 KB per page view only after many address pages, and the hash-set form is opaque for the gain.
- **Sort progressively as the lazy batches arrive.** Rejected. A verified token at position 900 stays invisible until it is fetched, so rows would reshuffle under the cursor while the user scrolls.
- **Keep RPC order.** Rejected: it is the status quo the issue reports.

The added cost is bounded and lands only where it is needed. Resolving 1051 mints costs 35 KB up and 17 KB down gzipped, split across five chunked requests that fire in parallel. The page already downloads 85 KB gzipped of token accounts before any of this, so the sort adds about a fifth to a transfer that already happens, and it replaces the ~53 lazy round trips a fully expanded list costs today.

## What Changes

- Resolve mint metadata for the whole holdings list up front, instead of lazily per visible row. The lookup replaces the lazy path rather than adding to it, so its cost stays proportional to the list: a 20-mint account issues one request for 20 addresses, exactly what it issues today. Lists longer than the route's cap are chunked and merged. No mint-count threshold — gating the lookup would leave small lists unsorted and split the card into two behaviours for no saving.
- Order the deduplicated mints into three tiers: verified, then known to UTL but unverified, then unknown to UTL. RPC order is preserved within each tier, so the order is stable and reproducible.
- Send the bulk lookup through `POST /api/token-info` rather than the `'use server'` action `TokenInfoBatchProvider` calls. The route wraps its upstream UTL call in the Next data cache under `CACHE_MAX_AGE`, so visitors who request the same chunk share one upstream round trip. The response itself is an uncached POST — the saving is the upstream call, not the request.
- Raise the request cap above its current 128 and correct the comment on it, which still claims `TokensProvider` sends at most 101 token accounts — untrue since #1181. One constant is both the route's cap and the client's chunk size, so it bounds one request without bounding the list.
- `TokenRow` stops calling `useTokenInfo` and takes resolved metadata as props, becoming presentational.
- Clusters with no curated UTL data resolve nothing as verified, so every mint falls into the last tier and the order matches today's.

## Impact

- **Files:** `app/components/account/OwnedTokensCard.tsx`, `app/api/token-info/config.ts`, plus a bulk resolution hook and a pure ordering function under `app/entities/token-info/`.
- **Behaviour:** the first 20 rows change for any address holding verified tokens. `app/components/account/__tests__/OwnedTokensCard.spec.tsx` asserts on row order and needs updating.
- **Transfer:** for a 1051-mint address, 35 KB more uploaded and 17 KB more downloaded, against the 85 KB the page already fetches. Small accounts are unaffected — the lookup is the same size the lazy path already issues. Fully expanding a large list gets cheaper: a couple of chunked requests instead of ~53.
- **Latency:** the card's first paint waits on the bulk lookup. UTL answered all 1051 addresses in 0.42 s when called directly; the chunked path through the route is not yet timed. Reordering after paint was rejected as visually worse.
- **Accepted risk:** verification rests on one upstream list. If UTL fails, the tiers collapse and the order falls back to today's RPC order — degraded, not broken.
- **Unchanged:** the RPC fetch in `TokensProvider`, the Summary/Detailed toggle, Load More paging, and `TokenHistoryCard`.
