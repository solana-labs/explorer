# @explorer/parsers

Instruction-parsing contract shared by the explorer app and sibling packages: the `InstructionParser` interface, the `createInstructionParserDispatcher` factory (dual-path — raw kit-shaped bytes via `fromTransaction`, RPC-pre-parsed instructions via `fromParsed`), and the `KitInstruction` shape parsers implement against.

The transitional pieces — `toParsedInstruction`/`toParsedTransaction` shims and the web3.js ↔ kit conversions (`toKitInstruction`, `toLegacyPublicKey`, `toKitAddress`) — live in the separate `@explorer/parsers/compat` entry. New code should build against the root contract and not depend on `/compat`; it exists for consumers not yet on kit shapes and shrinks as they migrate.

The design and rationale live in the OpenSpec proposal [`unify-instruction-parsing`](../../openspec/changes/unify-instruction-parsing/proposal.md) — one parser per program, one canonical `SliceParsed` shape, one place to add a program. This package hosts the _contract_; the per-program parser slices (`app/features/decode-instruction-*`) and the React provider stay in the app.

Program decoders shared between the app slices and `@explorer/entity-inspector` live under `src/programs/<program>` (exported as `@explorer/parsers/programs/<program>`), starting with the System program.

Not to be confused with the per-program `@explorer/decoder-*` packages (serum, mango, pyth): those decode one protocol each, this package carries the generic parsing contract they and the app slices plug into.

The agadoo tree-shaking gate covers the root contract entry only: the `/compat` and `/programs/*` entries define superstruct schemas at module scope, which Rollup cannot prove pure without annotating every nested field call — and schema modules are imported for their struct values wholesale, so the check adds nothing there (same trade-off as `@explorer/decoder-serum`).
