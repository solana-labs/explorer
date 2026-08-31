# instruction-card

## Purpose

One rendering layer for instruction cards, shared by `/tx/[signature]` and `/tx/(inspector)/inspector`. A card declares what an instruction means; the surface it renders on owns the chrome. Adding a field is one descriptor; adding a surface is one Context value.

**Scope.** These requirements bind every card that has migrated to the surface, and every card that migrates from here on. They are not a description of the current tree: System (13 cards) is the only migrated program, and the remaining 58 frame-drawing cards still resolve their own chrome — 49 hardcode `InstructionCard`, 7 take it as a prop, 2 hardcode it while being inspector-reachable. Each requirement below therefore reads as the rule a migration must satisfy, not as an invariant that already holds repo-wide.

## ADDED Requirements

### Requirement: Surface-owned chrome

Instruction cards MUST NOT receive surface chrome as props. The card frame, the address renderer, whether the leading `Program` row is emitted, and the transaction's `SignatureResult` SHALL be supplied by an `InstructionSurface` value through React Context.

This supersedes the `InstructionCardComponent`, `AddressComponent`, and `showProgramField` injection props, and the inspector's `INSPECTOR_RESULT` / `INSPECTOR_SIGNATURE` placeholder constants — for migrated cards. All five still exist for the unmigrated ones; the props go program by program, and the constants go last, once the shared `UnknownDetailsCard` fallback stops requiring `result` as well. `useInstructionSurface` fails loudly rather than falling back to a default, matching `useInstructionParser`.

#### Scenario: Same card on both surfaces

- **WHEN** the same instruction renders on the tx page and in the inspector
- **THEN** the card component MUST be the same component in both cases
- **AND** only the surface value MUST differ

#### Scenario: Program row is claimed exactly once

- **WHEN** a surface's frame already renders a `Program` row of its own
- **THEN** that surface MUST set `showProgramField: false`
- **AND** exactly one `Program` row MUST appear in the rendered card

#### Scenario: Missing provider

- **WHEN** a card renders outside an `InstructionSurfaceProvider`
- **THEN** `useInstructionSurface` MUST throw

### Requirement: Fields declared as data

A card's rows SHALL be declared as `InstructionField` descriptors rather than as table markup. Among migrated cards, `InstructionFields` MUST be the only component that knows row markup, cell alignment, and which address renderer the current surface uses. `ProgramField` is the single sanctioned exception: it owns the markup of the leading `Program` row, because the inspector renders that row through its own validator.

The union is closed: `address`, `sol`, `bytes`, `seed`, `text`, `timestamp`, `preformatted`, `custom`. `text` MUST accept only `string | number`, and `custom` MUST be the sole markup door. `timestamp` MUST take unix seconds and own the UTC conversion; `preformatted` MUST draw its value in a `<pre>` and MUST take a list unjoined, so that no card spells out the layout itself. `address` MUST accept both a web3.js `PublicKey` and a kit `Address`, coerced by the row rather than by the card, so kit-native slices stay kit-native. `custom` MUST take a `ReactElement` rather than a `ReactNode`, so that a labelled row with nothing in it is not representable; a field with no value to show MUST be omitted from the list instead.

`InstructionFieldList` MUST admit `false` and `undefined` so optional rows read as `cond && address(...)`, and MUST NOT admit `null`, which `unicorn/no-null` forbids in card sources under `app/**` (the rule is off for tests and stories, and for a per-file legacy list that a migrated card MUST NOT join).

#### Scenario: Field kind with no renderer

- **WHEN** an `InstructionField` kind has no branch in the field renderer
- **THEN** the build MUST fail on an exhaustiveness check
- **AND** if such a descriptor still arrives at runtime the row MUST render empty and the kind MUST be reported, rather than the card failing

#### Scenario: Repeated shape earns its own kind

- **WHEN** the same value rendering repeats across cards
- **THEN** it MUST be added as an `InstructionField` kind
- **AND** those cards MUST NOT each re-implement it through `custom`

#### Scenario: Kind that renders like an existing one

- **WHEN** a proposed kind would produce the same markup as a kind already in the union
- **THEN** it MUST NOT be added, and the existing kind MUST widen its value type instead
- **AND** a kind whose name describes a typeface rather than the value MUST NOT be added at all

#### Scenario: Card needing real markup

- **WHEN** a card's content does not fit the descriptor vocabulary
- **THEN** it MAY render `InstructionCardView` with its own children instead
- **AND** it MUST still take its chrome from the surface

#### Scenario: Card whose content depends on a hook

- **WHEN** a card needs a hook to produce a value or its title (async mint decimals, cluster-derived URLs, program events)
- **THEN** it MUST NOT use `defineInstructionCard`, whose `title` and `fields` are plain functions
- **AND** it MUST write its own component and render `InstructionCardView`
- **AND** it SHOULD still use `InstructionFields` for the rows it can express, with `custom()` for the rest

### Requirement: Single node prop

A card SHALL receive the instruction it renders as one `InstructionNode`, not as a spread of `ix`, `index`, `childIndex`, `raw`, and `innerCards`. Nested cards MUST NOT travel through cards as props — only the view hands `InstructionNode.innerCards` to the frame, and no card reads it.

`InstructionNode.children` is the target representation for CPI children and stays unpopulated until tree construction moves out of the render pass. `innerCards` is marked deprecated and is deleted in that same follow-up.

`InstructionNode.ix` is provisional: it exists for the frame, which branches on `'parsed' in ix` for the Raw view. Cards MUST NOT read `node.ix`, so the field can be reshaped when the instruction-parser compat wrap is deleted without touching any card.

`InstructionNode.programId` SHALL carry the program id separately from `ix`, and is the only node field a card reads — it has to, because `InstructionFields` takes `programId` as a prop. It is stated as its own field rather than derived from `ix` at each call site precisely so that the `MUST NOT read node.ix` rule above stays absolute, and it is the first piece of the eventual `programId` + `raw` + optional-parsed-payload split already in place.

Program events are the deliberate exception to "nesting travels on the node". They are read from transaction logs *inside* the card and exist only on the tx page, so they MUST arrive as `InstructionCardView`'s `events` prop and MUST NOT be added to `InstructionNode`. A surface whose frame cannot render them SHALL drop them rather than fail.

#### Scenario: Program events reach the frame

- **WHEN** a card derives program events from transaction logs
- **THEN** it MUST pass them to `InstructionCardView` as `events`, not through the node
- **AND** on a surface with no logs the frame MUST render the card without them

#### Scenario: Card is unaware of nesting

- **WHEN** an instruction has inner instructions
- **THEN** the card MUST NOT declare or read any nested-card prop
- **AND** the nested cards MUST reach the frame through the view

#### Scenario: Card reads only its decoded payload

- **WHEN** a card needs the instruction's raw bytes or its RPC-parsed payload
- **THEN** it MUST NOT read them from `node.ix` — the frame obtains them from the node instead
- **AND** the values the card renders MUST come only from its decoded `info`
- **AND** the only node field the card may read MUST be `node.programId`

### Requirement: Whole-program migration

A program's cards SHALL migrate to the surface together in one change, never partially. A partially migrated program renders two different frames side by side in the inspector, because unmigrated cards hardcode the tx-page frame regardless of surface.

#### Scenario: Program with a hardcoded frame reaches the inspector

- **WHEN** a program's cards hardcode `InstructionCard` and the inspector routes to that program
- **THEN** all of that program's cards MUST migrate in the same change
- **AND** the resulting inspector chrome deltas MUST be reviewed before merge
