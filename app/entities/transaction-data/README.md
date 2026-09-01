# transaction-data

Fetches a transaction and answers two questions per instruction: **what is it called**, and **what
program owns it**.

Naming is the part worth reading before you change anything here. It runs in three stages, and every
surface runs all three.

## The flow

```
STAGE 1 — sync, no I/O                                        per instruction
─────────────────────────────────────────────────────────────────────────────
  ParsedInstruction ─────┐
                         ├──→ resolveInstructionNames ──┐
  PartiallyDecoded ──────┘                              │
                                                        ├──→ InstructionNames
  compiled bytes ────────────→ resolveNamesFromData ────┘    { name         }
       (simulation)                                          { programName  }
                    both call findProgramName → programName   { nameLookup? }

STAGE 2 — async, the ONLY I/O in the pipeline        per transaction, 1 SWR entry
─────────────────────────────────────────────────────────────────────────────
  rows still carrying a nameLookup ──→ their programIds
        └──→ useProgramIdlNames ──→ Map<programId, ProgramIdlNames>

STAGE 3 — sync, no I/O                                        per instruction
─────────────────────────────────────────────────────────────────────────────
  (InstructionNames, Map) ──→ applyNameSources · applyNameSourcesToSummaries
                                    └─→ NAME_SOURCES, first hit wins
```

`name` and `programName` are required keys holding `string | undefined`, not optional keys — see the
comment on `ResolvedNames` in `lib/types.ts` for why that distinction is load-bearing. Only `nameLookup`
is optional, and its presence is invariant 3 below.

Stages 2 and 3 are wrapped together by the two hooks the barrel exports, so a consumer writes one line:

| Surface | Stage 1 | Stages 2 + 3 |
| --- | --- | --- |
| account-page transaction history | `getInstructionSummaries` | `useResolvedSummaryNames` |
| CU profiling chart | `resolveInstructionNames` | `useResolvedInstructionNames` |
| instruction simulation | `resolveNamesFromData` | `useResolvedInstructionNames` |

Those three are the only consumers. `getInstructionSummaries` calls `resolveInstructionNames` per
instruction and adds the sentinels; the CU chart calls `resolveInstructionNames` itself, so it keeps the
`undefined` and falls back to the row's position.

The `/tx/[signature]` instruction cards do **not** use this pipeline. They render through
`app/features/transaction/ui/InstructionsSection.tsx` and the `instruction-parser` dispatcher, which
decodes arguments and accounts rather than resolving a display name.

## Invariants

Break one of these and something downstream misreads a transaction. They are what the tests in
`lib/__tests__` and `model/__tests__` exist to hold.

1. **Naming never fetches.** Stages 1 and 3 are pure functions. All I/O is in stage 2, hoisted to one
   hook per surface, so one SWR entry serves a whole transaction. Everything in `lib/` is hook-free; the
   IDL map arrives as an argument. `model/` is the only segment that calls `useProgramIdlNames`.
2. **Naming never throws.** `identifyInstruction` turns every generated-client throw into `undefined`.
   Callers render with no error boundary, so failing to name an instruction must never take down a page.
3. **`nameLookup` present ⇒ the row is still unnamed.** Set when nothing named the row, dropped the
   moment something does. `keptLookup` is the single owner of that rule, for every row shape, and it
   keys the decision on what the sources returned — never on whether the name string changed, since a
   summary row already carries the sentinel `Unknown Instruction`.
   One direction only: an RPC-parsed instruction that is neither a typed instruction nor a memo is
   unnamed *without* a lookup, because it carries no raw data to hand on — see the last branch of
   `resolveInstructionNames`. So `!nameLookup` never means "this row has a name".
4. **A name source returns `undefined` for "not mine", never a guess.** Program gate first, discriminator
   second. Every source has the shape `(lookup, idlNames) => string | undefined`.
5. **Row count and order survive every stage.** Consumers pair row `i` with `instructionLogs[i]`, so a
   dropped row shifts every later CU figure onto the wrong instruction. Two places change the row count,
   and neither can shift an index. `getInstructionSummaries` filters Compute Budget out — safe because
   summary rows are never paired with logs at all, not because of where it runs. `resolveRows` drops
   *every* row on an out-of-range `programIdIndex` rather than leaving a gap. The two surfaces that do
   pair rows with logs never filter.
6. **Only bytes 0–15 name an instruction** (`MAX_DISCRIMINATOR_BYTES`). Nothing downstream sees the
   argument payload.
7. **One instruction has one wording everywhere.** `rpcTypeOverrides` in `program-client-name.ts` makes
   the generated-client name match the RPC's `parsed.type`, so a simulated instruction reads the same as
   a fetched one.

## Adding a name source

Add one entry to `NAME_SOURCES` in `lib/name-sources.ts`. Nothing else changes — the stages, the hooks,
and every consumer already route through it.

Order in the list is precedence, first hit wins. Put a source ahead of the IDL when its wording should
beat an IDL's; put the highest-traffic programs early so the common case short-circuits.

A source that needs no fetch reads straight from `lookup`. Only the IDL source reads `idlNames`, which is
why an empty map still names most instructions — an empty map means "no IDL", never "nothing is named
yet".

## Why not use the IDL for everything?

The IDL **is** the default. It is the last entry in `NAME_SOURCES` and the catch-all for every program
that reaches the fetch — Jupiter, marginfi and the rest all resolve that way, and a new program needs no
code here at all.

Two things are held back from it. The built-in sources below are one. The other is `NON_ANCHOR_PROGRAMS`
(`entities/idl/api/config.ts`), which `useProgramIdlNames` filters out of the fetch entirely: those
programs never reach the IDL source whether or not a built-in source names them. That set is why the ✅
rows in the table below are not programs we *chose* not to read an IDL for — the fetch refuses them
structurally. It also covers builtins with no built-in source at all (Vote, Config, Address Lookup Table,
Ed25519, Secp256k1, the BPF loaders), which stay unnamed by design rather than by omission.

The built-in sources are a short list of exceptions, kept for three reasons.

**1. Most of them have no IDL to switch to.** A snapshot, not a property of the code — a PMP IDL is an
on-chain account and can appear the day after this was checked. Re-check with
`curl '/api/idl-latest?programAddress=<id>&cluster=<cluster>'`. Checked against mainnet, 2026-08-19:

| Source | IDL |
| --- | --- |
| `compute-budget-name` | ✅ pmp, 5 ix |
| `program-client-name` → System / Token / Stake / ATA | ✅ pmp |
| `program-client-name` → **Token-2022** | ❌ none |
| **ZK ElGamal**, **Lighthouse**, **Mango**, **Serum** | ❌ none |
| **Pyth** | ❌ none on mainnet, devnet or testnet (checked 2026-09-01) |

Three could not use an IDL even if one existed, because none of them has a discriminator to match on.
Serum reads a u32 instruction code after a 1-byte version prefix, and Pyth a u32 instruction index after
a u32 version. `memo-name` reads nothing at all — a memo's entire instruction data is its UTF-8 text, so
the program id is the whole lookup.

**2. The IDL wording would split one instruction across two surfaces.** The System IDL names its transfer
`transferSol`; the RPC's `parsed.type` calls it `transfer`. A fetched transaction is named from
`parsed.type` at stage 1 and never consults an IDL, so switching stage 3 to IDL wording would make the
same instruction read `Transfer` on the tx page and `Transfer Sol` in the simulator — invariant 7. That
is what the `rpcTypeOverrides` map in `program-client-name.ts` exists to prevent. Token and Token-2022
carry no overrides because their *generated-client enum names* already match `parsed.type` for every
instruction checked — not because of an IDL, which neither program's naming ever consults. Token-2022's
extension groups are unverified against the RPC.

**3. Cluster coverage.** A PMP IDL is an on-chain account, so it exists per cluster. As of 2026-08-19 the
Compute Budget IDL account is present on mainnet and devnet, **absent on testnet**, and unreachable on
custom/localhost —
`useProgramIdlNames` returns an empty map there, having no client-side fallback (unlike `useProgramIdls`).
A discriminator lookup works on every cluster.

### Not reasons

Both of these look convincing and are wrong; they were argued and discarded, so do not rebuild them:

- **"An IDL fetch costs a round trip."** It does not, in the steady state. `/api/idl-latest` returns
  `public, max-age=1800, s-maxage=1800, stale-while-revalidate=60`, so it is a CDN and browser-cache hit,
  and Compute Budget would be the hottest key in the app.
- **"An IDL name arrives late and the row flashes."** Async naming is already the norm here — every
  IDL-named program behaves that way, `Instruction #N` is a deliberate positional placeholder, and the CU
  card sits below the fold. A flash is not a defect.

## Two row shapes

`InstructionNames` leaves an unresolved name `undefined`, so a consumer can render its own fallback — the
CU chart builds one from the instruction's position, and picks a different one per surface: its legend
shows every row at once, so an unnamed row reads `#4 Unknown Instruction` and keeps the shape of the rows
around it, while its tooltip shows one row alone, where `Instruction #4` identifies which.
`InstructionSummary` substitutes `Unknown Instruction` / `Unknown Program` instead, so a summary row never
needs one.

Within the pipeline, `summarizeInstruction` is the only place those sentinels are introduced — everything
upstream of it returns `undefined`. `getProgramName` in `lib/get-program-name.ts` also defaults to
`UNKNOWN_PROGRAM_NAME`, but it serves callers outside naming; the pipeline uses its `findProgramName`
sibling, which returns `undefined`.

## Everything else

`api/` fetches raw and parsed transactions. `lib/adapt-parsed-transaction.ts`, `lib/encoding.ts`, and
`lib/merge-transaction-map.ts` are unrelated to naming and stand on their own. `model/types.ts` holds the
transaction types the barrel re-exports.
