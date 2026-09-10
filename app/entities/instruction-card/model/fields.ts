import type { Address } from '@solana/kit';
import type { PublicKey } from '@solana/web3.js';
import type { ReactElement } from 'react';

/** Kit-native slices hold `Address`, older ones `PublicKey`. Rows coerce, so cards need not. */
export type FieldAddress = PublicKey | Address;

/**
 * A row in an instruction card, described as data.
 *
 * Cards declare *what* a field means; `InstructionFields` decides how to draw
 * it. That split is what lets the inspector swap the address renderer without
 * every card taking an `AddressComponent` prop.
 */
export type InstructionField = InstructionValueField | InstructionHeadingField;

/** A label paired with a value, which is every row except a group's heading. */
export type InstructionValueField =
    | { kind: 'address'; label: string; pubkey: FieldAddress }
    | { kind: 'sol'; label: string; lamports: number | bigint }
    | { kind: 'bytes'; label: string; size: number }
    | { kind: 'seed'; label: string; seed: string }
    | { kind: 'text'; label: string; value: string | number }
    | { kind: 'timestamp'; label: string; unixSeconds: number }
    | { kind: 'preformatted'; label: string; value: string | ReadonlyArray<string | number> }
    | { kind: 'custom'; label: string; value: ReactElement };

/** Names the rows that follow it, so it fills the row instead of pairing a label with a value. */
export type InstructionHeadingField = { kind: 'heading'; label: string };

/**
 * Falsy entries are dropped, so optional fields read as `cond && address(...)`.
 *
 * `null` is deliberately not accepted: `unicorn/no-null` forbids the literal
 * across `app/**`, so admitting it here would advertise a spelling no caller
 * may write.
 */
export type InstructionFieldList = ReadonlyArray<InstructionField | false | undefined>;

/** An account address. Links out on the tx page, resolves in-transaction in the inspector. */
export function address(label: string, pubkey: FieldAddress): InstructionField {
    return { kind: 'address', label, pubkey };
}

/** A lamport amount, rendered as SOL. */
export function sol(label: string, lamports: number | bigint): InstructionField {
    return { kind: 'sol', label, lamports };
}

/** An account data size, rendered as `N byte(s)`. */
export function bytes(label: string, size: number): InstructionField {
    return { kind: 'bytes', label, size };
}

/** A PDA derivation seed, rendered as copyable code. */
export function seed(label: string, value: string): InstructionField {
    return { kind: 'seed', label, seed: value };
}

/** Plain text or a number. Deliberately not `ReactElement` — use `custom` for markup. */
export function text(label: string, value: string | number): InstructionField {
    return { kind: 'text', label, value };
}

/** A unix-seconds instant. The row owns the UTC formatting so cards hold the raw value. */
export function timestamp(label: string, unixSeconds: number): InstructionField {
    return { kind: 'timestamp', label, unixSeconds };
}

/**
 * A value whose whitespace is significant — a hash or key blob shown untruncated, or a
 * list shown one entry per line. Takes the list unjoined so no card spells out the layout.
 */
export function preformatted(label: string, value: string | ReadonlyArray<string | number>): InstructionField {
    return { kind: 'preformatted', label, value };
}

/**
 * A divider that names the rows below it, for a card whose fields fall into repeated
 * groups. It labels the group rather than a value, so it takes the whole row.
 */
export function heading(label: string): InstructionField {
    return { kind: 'heading', label };
}

/**
 * Escape hatch for fields the vocabulary above does not cover — token amounts
 * needing mint decimals, nested structs, bespoke widgets. Prefer a new `kind`
 * once a shape repeats across programs.
 *
 * Takes a `ReactElement` rather than a `ReactNode` so a row always has
 * something to draw. `ReactNode` admits `undefined`, `false`, and `''`, which
 * would make a labelled blank row representable — use `text` for plain values
 * and omit the field entirely when there is nothing to show.
 */
export function custom(label: string, value: ReactElement): InstructionField {
    return { kind: 'custom', label, value };
}

export function compactFields(fields: InstructionFieldList): InstructionField[] {
    return fields.filter((field): field is InstructionField => Boolean(field));
}
