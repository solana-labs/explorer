## ADDED Requirements

### Requirement: Token holdings SHALL be ordered by verification tier

The Token Holdings card SHALL order deduplicated mints into three tiers, most trustworthy first: mints the unified token list (UTL) marks `verified`, then mints UTL knows but does not mark verified, then mints UTL does not know. The order MUST be stable — within a tier, mints keep the order the RPC returned them in — so the same holdings render the same way on every load. No mint is removed from the list by this ordering; every holding stays reachable through Load More.

#### Scenario: Verified holdings lead the list

- **WHEN** an account holds mints across all three tiers
- **THEN** the card SHALL render every `verified` mint before any known-but-unverified mint
- **AND** every known-but-unverified mint before any mint unknown to UTL

#### Scenario: Ordering is stable within a tier

- **WHEN** two mints share a tier
- **THEN** they SHALL keep their relative RPC order
- **AND** re-rendering the card without refetching SHALL NOT change their order

#### Scenario: Total count is unchanged by ordering

- **WHEN** an account holds 1051 distinct mints of which 78 are verified
- **THEN** the footer SHALL still report 1051 as the total
- **AND** all 1051 SHALL remain reachable through Load More

### Requirement: Verification SHALL be resolved for the whole list before the card renders rows

The card MUST resolve mint metadata for every holding up front rather than lazily per visible row, because a tier cannot be assigned to a mint whose metadata has not been fetched. This lookup replaces the per-row lookup instead of adding to it, so a list issues one request for the mints it holds. The card SHALL show its existing loading state until the lookup settles, and MUST NOT render an unsorted list that reorders afterwards.

#### Scenario: Rows wait for verification rather than reordering

- **WHEN** holdings have loaded but the metadata lookup is still in flight
- **THEN** the card SHALL keep showing the loading state
- **AND** it SHALL NOT render rows that would reorder once the lookup settles

#### Scenario: A small account issues no more requests than before

- **WHEN** an account holds 20 distinct mints
- **THEN** the card SHALL resolve them in a single request
- **AND** rows SHALL NOT issue per-row metadata requests

#### Scenario: A long list is chunked

- **WHEN** an account holds more distinct mints than one request may carry
- **THEN** the card SHALL split them into chunks no larger than that cap
- **AND** merge the results before ordering

### Requirement: The bulk lookup SHALL use the cacheable token-info route

Metadata for the holdings list SHALL be requested through `POST /api/token-info`, which wraps its upstream call in the Next data cache, and MUST NOT use the `'use server'` action that per-row lookups call, because that action makes every visitor re-pay the upstream round trip. The request cap SHALL be raised above its current 128, and one constant SHALL serve as both the route's cap and the chunk size the client splits on, so the two cannot drift.

#### Scenario: Repeat views reuse the cached result

- **WHEN** two visitors open the same address within the route's cache window
- **THEN** the second request SHALL be served from cache without a second upstream call

#### Scenario: A request at the cap is accepted

- **WHEN** the client sends exactly `MAX_ADDRESSES` distinct mints
- **THEN** the route SHALL resolve them rather than rejecting the request

### Requirement: Holdings SHALL fall back to RPC order when verification is unavailable

Ordering MUST degrade rather than fail. When the metadata lookup fails, or when the active cluster has no curated UTL data, every mint SHALL be treated as unknown, which collapses the three tiers into one and leaves the list in RPC order — the order shipped today. The card SHALL still render every holding, and a failed lookup MUST NOT produce an error state or an empty list.

Degrading silently to the user is not the same as degrading silently to us. An outage MUST stay distinguishable from a genuine "none of these mints are listed": the route SHALL answer a failed lookup with an error status rather than an empty list, so the failure is reported and is not cached as though the list had spoken. A lookup that resolved some mints and dropped others is not an outage and SHALL still answer what it resolved. Every request SHALL be bounded by a timeout, because an unbounded one leaves the card on its loading state indefinitely.

#### Scenario: Upstream failure

- **WHEN** the metadata lookup fails for every chunk
- **THEN** the card SHALL render all holdings in RPC order
- **AND** it SHALL NOT show an error card

#### Scenario: An outage is not cached as an answer

- **WHEN** the upstream list lookup reports an error and resolves no mints
- **THEN** the route SHALL answer an error status rather than `200` with an empty list
- **AND** the failure SHALL be reported to error tracking

#### Scenario: A stalled lookup gives up

- **WHEN** a chunk's request does not settle within its timeout
- **THEN** that chunk SHALL be abandoned and its mints treated as unknown
- **AND** the card SHALL leave its loading state

#### Scenario: Cluster without curated data

- **WHEN** the active cluster resolves no verified mints
- **THEN** every mint SHALL fall into the unknown tier
- **AND** the rendered order SHALL match the RPC order

#### Scenario: Partial failure

- **WHEN** one chunk resolves and another fails
- **THEN** mints from the resolved chunk SHALL be tiered normally
- **AND** mints from the failed chunk SHALL be treated as unknown

### Requirement: Token rows SHALL receive resolved metadata as props

`TokenRow` MUST become presentational: it SHALL take the mint's resolved name, symbol and logo as props and SHALL NOT call a metadata hook of its own, since the card already holds metadata for every mint after the bulk lookup. This removes one hook per rendered row and keeps the row testable without a provider.

#### Scenario: Row renders from props alone

- **WHEN** a row is rendered with resolved metadata
- **THEN** it SHALL display that symbol and logo
- **AND** it SHALL NOT trigger a metadata request

#### Scenario: Row renders for a mint with no metadata

- **WHEN** a row is rendered for a mint UTL does not know
- **THEN** it SHALL render the mint address and balance
- **AND** it SHALL omit the symbol and fall back to the placeholder logo
