'use client';

import { Copyable } from '@components/common/Copyable';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import type { PublicKey } from '@solana/web3.js';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
import React from 'react';

import { Logger } from '@/app/shared/lib/logger';
import { toLegacyPublicKey } from '@/app/shared/lib/web3js-compat';
import { BaseTable } from '@/app/shared/ui/Table';

import { compactFields, type FieldAddress, type InstructionField, type InstructionFieldList } from '../model/fields';
import { useInstructionSurface } from '../model/surface';
import { ProgramField } from './ProgramField';

/**
 * Renders field descriptors as card rows. This is the only place that knows the
 * row markup, the cell styling, how each kind formats its value, and which
 * address renderer the current surface uses. The leading `Program` row is the one
 * exception — `ProgramField` owns it, because the inspector needs its own
 * validator on that row.
 */
export function InstructionFields({ fields, programId }: { fields: InstructionFieldList; programId: PublicKey }) {
    const { showProgramField } = useInstructionSurface();

    return (
        <>
            {showProgramField && <ProgramField programId={programId} />}
            {compactFields(fields).map((field, i) => (
                <FieldRow key={`${field.label}-${i}`} field={field} />
            ))}
        </>
    );
}

/** Keyed by every kind, so a new one must state its cell styling or fail the build. */
const CELL_CLASS: Record<InstructionField['kind'], string | undefined> = {
    address: undefined,
    bytes: undefined,
    custom: undefined,
    // `preformatted` draws a <pre>, which is monospaced already.
    preformatted: undefined,
    seed: undefined,
    sol: undefined,
    text: undefined,
    timestamp: 'font-mono',
};

function FieldRow({ field }: { field: InstructionField }) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>{field.label}</BaseTable.Cell>
            <BaseTable.Cell className={cn('text-right', CELL_CLASS[field.kind])}>
                <FieldValue field={field} />
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}

/** Turns one descriptor into the cell content its `kind` calls for. */
function FieldValue({ field }: { field: InstructionField }) {
    const { Address } = useInstructionSurface();

    switch (field.kind) {
        case 'address':
            return <Address pubkey={toPublicKey(field.pubkey)} />;
        case 'sol':
            return <SolBalance lamports={field.lamports} />;
        case 'bytes':
            return <>{`${field.size} byte(s)`}</>;
        case 'seed':
            return (
                <Copyable text={field.seed}>
                    <code>{field.seed}</code>
                </Copyable>
            );
        case 'text':
            return <>{field.value}</>;
        case 'timestamp':
            return <>{displayTimestampUtc(unixTimestampToMs(field.unixSeconds))}</>;
        case 'preformatted':
            return <pre className="mb-0 inline-block text-left">{joinLines(field.value)}</pre>;
        case 'custom':
            return field.value;
        default:
            return reportUnrenderedKind(field);
    }
}

function joinLines(value: string | ReadonlyArray<string | number>): string {
    return typeof value === 'string' ? value : value.join('\n');
}

/** The surface's address prop is `PublicKey`; Kit's `Address` is a branded string, so `typeof` narrows it. */
function toPublicKey(pubkey: FieldAddress): PublicKey {
    return typeof pubkey === 'string' ? toLegacyPublicKey(pubkey) : pubkey;
}

/**
 * Exhaustiveness check for `InstructionField`. Adding a `kind` without a branch
 * above fails the build here rather than silently rendering a blank cell. If one
 * still arrives at runtime — a descriptor built from unvalidated data — the row
 * renders empty and the kind is reported instead of crashing the whole card.
 */
function reportUnrenderedKind(field: never): undefined {
    Logger.error(new Error('[instruction-card] field kind has no renderer'), {
        kind: (field as InstructionField).kind,
    });
    return undefined;
}
