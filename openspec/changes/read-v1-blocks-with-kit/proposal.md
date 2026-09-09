# Proposal: Read v1 blocks with kit

## Why

Block pages pin `maxSupportedTransactionVersion: 0`. `getBlock` has no partial mode, so one v1 transaction fails the whole block. Pinning to `1` fails at runtime on web3.js 1.98.4, whose schema admits only `0`/`legacy` and cannot hold `transactionConfig`. kit is the migration direction, so blocks follow the transaction and inspector paths.

Three non-obvious choices:

- **`base64` over `json`** — the wire bytes let kit decode every supported message version, including v1 config values that the RPC JSON response does not expose.
- **Kit types remain intact through the block feature** — addresses, messages, signatures, slots, lamports, and RPC quantities are not adapted into web3.js shapes.
- **Unreadable transactions retain their position** — a failed transaction decode becomes an explicit unavailable entry, so one malformed response cannot silently remove a row and shift every later transaction index.

## What Changes

New `app/entities/block-data`, fetched from `app/providers/block.tsx`. The entity decodes compiled messages with kit and provides version-neutral helpers for the block cards. `estimateRequestedComputeUnits` reads v1's limit from the decoded message config. The block provider and cards consume kit types directly.

## Impact

Legacy/v0 behavior is unchanged. Still pinned at `0`: receipt, transaction history, PMP discovery, interactive IDL, `entity-inspector` default. Those paths remain outside this block-focused migration.
