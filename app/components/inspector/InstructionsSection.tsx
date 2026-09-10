import { BaseInstructionCard } from '@components/common/BaseInstructionCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { type InstructionSurface, InstructionSurfaceProvider } from '@entities/instruction-card';
import { isParsedInstruction, toParsedTransaction, useInstructionParser } from '@entities/instruction-parser';
import {
    BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL,
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_LABEL,
    SPL_TOKEN_2022_PROGRAM_LABEL,
    SPL_TOKEN_PROGRAM_LABEL,
    SYSTEM_PROGRAM_LABEL,
} from '@explorer/parsers';
import { AssociatedTokenDetailsCard } from '@features/decode-instruction-associated-token';
import { LighthouseDetailsCard } from '@features/decode-instruction-lighthouse';
import { isProgramMetadataInstruction } from '@features/decode-instruction-pmp/detection';
import { IdlInstructionCard, useIdlInstructionDecode } from '@features/decode-instruction-with-idl';
import { MetaplexTokenMetadataDetailsCard } from '@features/mpl-token-metadata';
import { useCluster } from '@providers/cluster';
import {
    AddressLookupTableAccount,
    type CompiledInnerInstruction,
    ComputeBudgetProgram,
    type TransactionInstruction,
    TransactionMessage,
    type VersionedMessage,
} from '@solana/web3.js';
import { getProgramName } from '@utils/tx';
import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { resolveInnerInstructions } from '@/app/entities/transaction-data';
import { isTokenBatchInstruction, TokenBatchCard } from '@/app/features/token-batch';
import { useAddressLookupTables } from '@/app/providers/accounts';
import { FetchStatus } from '@/app/providers/cache';

import { ErrorCard } from '../common/ErrorCard';
import { InspectorInstructionCard as InspectorInstructionCardComponent } from '../common/InspectorInstructionCard';
import { LoadingCard } from '../common/LoadingCard';
import { BpfUpgradeableLoaderDetailsCard } from '../instruction/bpf-upgradeable-loader/BpfUpgradeableLoaderDetailsCard';
import { ComputeBudgetDetailsCard } from '../instruction/ComputeBudgetDetailsCard';
import { SystemDetailsCard } from '../instruction/system/SystemDetailsCard';
import { TokenDetailsCard } from '../instruction/token/TokenDetailsCard';
import { AddressWithContextCell } from './AddressWithContextCell';
import { UnknownDetailsCard } from './UnknownDetailsCard';

const INSPECTOR_RESULT = { err: null };
const INSPECTOR_SIGNATURE = '';
// The tx page's wording, plus the position, since this card draws no index badge of its own.
function undisplayableInstruction(index: number, childIndex: number): string {
    return `Could not display instruction #${index + 1}.${childIndex + 1}, please report`;
}
// A pasted or linked message carries no metadata, so it has no CPIs to show.
const NO_INNER_INSTRUCTIONS: ReturnType<typeof resolveInnerInstructions> = new Map();

// The PMP card carries the generated client plus pako/yaml/smol-toml (~35 kB gzip), which only a transaction that
// actually touches the program needs. `isProgramMetadataInstruction` comes from the light `/detection` entry so
// the branch below can stay static.
const PmpDetailsCard = dynamic(() => import('@features/decode-instruction-pmp').then(mod => mod.PmpDetailsCard), {
    loading: () => <LoadingCard />,
    ssr: false,
});

const INSPECTOR_SURFACE: InstructionSurface = {
    // The inspector resolves an address against the transaction under inspection
    // rather than linking out to its account page.
    Address: AddressWithContextCell,
    Shell: InspectorInstructionCardComponent,
    result: INSPECTOR_RESULT,
    // `InspectorInstructionCard` renders its own Program row, so the fields must not.
    showProgramField: false,
};

export function InstructionsSection({
    message,
    compiledInnerInstructions,
}: {
    message: VersionedMessage;
    compiledInnerInstructions?: CompiledInnerInstruction[];
}) {
    const { cluster } = useCluster();
    const hydratedTables = useAddressLookupTables(
        message.addressTableLookups.map(lookup => lookup.accountKey.toString()),
    );
    for (let i = 0; i < hydratedTables.length; i++) {
        const table = hydratedTables[i];
        if (table && table[1] === FetchStatus.FetchFailed) {
            return (
                <ErrorCard
                    text={`Failed to fetch address lookup table: ${message.addressTableLookups[
                        i
                    ].accountKey.toString()}`}
                />
            );
        }
    }

    const allDefined = hydratedTables.every(
        table => table !== undefined && table[0] instanceof AddressLookupTableAccount,
    );
    if (!allDefined) {
        return <LoadingCard />;
    }

    const addressLookupTableAccounts = (hydratedTables as any as Array<[AddressLookupTableAccount, FetchStatus]>).map(
        table => table[0],
    );
    const transactionMessage = TransactionMessage.decompile(message, { addressLookupTableAccounts });

    const innerByIndex = compiledInnerInstructions
        ? resolveInnerInstructions(
              compiledInnerInstructions,
              message.getAccountKeys({ addressLookupTableAccounts }),
              message,
          )
        : NO_INNER_INSTRUCTIONS;

    return (
        <CollapsibleSection id="instructions" title="Instructions" className="">
            <InstructionSurfaceProvider surface={INSPECTOR_SURFACE}>
                {transactionMessage.instructions.map((ix, index) => {
                    // A child that fails keeps its slot, so the siblings after it stay on the numbers
                    // their positions give them, and it says which number it holds.
                    const innerCards = innerByIndex.get(index)?.map((innerIx, childIndex) => {
                        if (!innerIx) {
                            return <ErrorCard key={childIndex} text={undisplayableInstruction(index, childIndex)} />;
                        }

                        return (
                            <ErrorBoundary
                                key={childIndex}
                                // The card carries the badge and the scroll anchor, so a throwing child
                                // stays numbered and linkable.
                                fallback={
                                    <UnknownDetailsCard
                                        index={index}
                                        childIndex={childIndex}
                                        ix={innerIx}
                                        programName={getProgramName(innerIx.programId.toBase58(), cluster)}
                                    />
                                }
                            >
                                <InspectorInstructionCard
                                    index={index}
                                    childIndex={childIndex}
                                    ix={innerIx}
                                    message={message}
                                />
                            </ErrorBoundary>
                        );
                    });

                    return (
                        <InspectorInstructionCard
                            key={index}
                            index={index}
                            ix={ix}
                            message={message}
                            innerCards={innerCards}
                        />
                    );
                })}
            </InstructionSurfaceProvider>
        </CollapsibleSection>
    );
}

function InspectorInstructionCard({
    message,
    ix,
    index,
    childIndex,
    innerCards,
}: {
    message: VersionedMessage;
    ix: TransactionInstruction;
    index: number;
    childIndex?: number;
    innerCards?: JSX.Element[];
}) {
    const { cluster } = useCluster();
    const dispatcher = useInstructionParser();

    const programId = ix.programId;
    const programName = getProgramName(programId.toBase58(), cluster);
    const parsedIx = useMemo(() => dispatcher.fromTransactionInstruction(ix), [dispatcher, ix]);
    const parsedTx = useMemo(
        () => (isParsedInstruction(parsedIx) ? toParsedTransaction(ix, message, [parsedIx]) : undefined),
        [ix, message, parsedIx],
    );

    // Dynamic IDL tier — shared with the tx page. See app/features/transaction/ui/InstructionsSection.tsx.
    const idlDecode = useIdlInstructionDecode({ programId: programId.toString(), raw: ix });

    // PMP owns every instruction on its program id: `setData`/`initialize`/`write` render decoded content from
    // the bundled typed decoders (no IDL needed), and the housekeeping instructions delegate to the IDL tier
    // from inside the card. Must sit before the generic idlDecode tier so it wins for the content instructions.
    if (isProgramMetadataInstruction(ix)) {
        return (
            <PmpDetailsCard
                ix={ix}
                index={index}
                result={INSPECTOR_RESULT}
                InstructionCardComponent={BaseInstructionCard}
                childIndex={childIndex}
                innerCards={innerCards}
                // The card cannot import the IDL feature (boundaries/dependencies), so this surface decides what
                // a non-content PMP instruction falls back to. Same two outcomes as before the branch existed.
                fallback={
                    idlDecode ? (
                        <IdlInstructionCard
                            decoded={idlDecode}
                            ix={ix}
                            index={index}
                            result={INSPECTOR_RESULT}
                            signature={INSPECTOR_SIGNATURE}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    ) : (
                        <UnknownDetailsCard
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    )
                }
            />
        );
    }

    // Ahead of the IDL tier on purpose: no Token IDL declares the batch discriminator, so that tier
    // resolves a batch as `unknown` and draws a raw card over the curated one.
    if (isTokenBatchInstruction(ix)) {
        return (
            <ErrorBoundary
                fallback={
                    <UnknownDetailsCard
                        key={index}
                        index={index}
                        ix={ix}
                        programName={programName}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                }
            >
                <TokenBatchCard
                    index={index}
                    ix={ix}
                    result={INSPECTOR_RESULT}
                    childIndex={childIndex}
                    innerCards={innerCards}
                />
            </ErrorBoundary>
        );
    }

    if (idlDecode) {
        return (
            <IdlInstructionCard
                decoded={idlDecode}
                ix={ix}
                index={index}
                result={INSPECTOR_RESULT}
                signature={INSPECTOR_SIGNATURE}
                childIndex={childIndex}
                innerCards={innerCards}
            />
        );
    }

    // Compute Budget instructions are not RPC-pre-parsed and its DetailsCard
    // decodes raw bytes directly, so no parser entry is needed today. Phase 3
    // of the unification will fold this into the registry.
    if (ComputeBudgetProgram.programId.equals(programId)) {
        return (
            <ComputeBudgetDetailsCard
                key={index}
                ix={ix}
                index={index}
                result={INSPECTOR_RESULT}
                signature={INSPECTOR_SIGNATURE}
                InstructionCardComponent={BaseInstructionCard}
                childIndex={childIndex}
                innerCards={innerCards}
            />
        );
    }

    if (!parsedIx) {
        return (
            <UnknownDetailsCard
                key={index}
                index={index}
                ix={ix}
                programName={programName}
                childIndex={childIndex}
                innerCards={innerCards}
            />
        );
    }

    if ('unknown' in parsedIx) {
        if (parsedIx.programLabel === 'mpl-token-metadata') {
            return (
                <ErrorBoundary
                    fallback={
                        <UnknownDetailsCard
                            key={index}
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    }
                >
                    <MetaplexTokenMetadataDetailsCard
                        key={index}
                        ix={ix}
                        index={index}
                        result={INSPECTOR_RESULT}
                        InstructionCardComponent={BaseInstructionCard}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                </ErrorBoundary>
            );
        }
        return (
            <UnknownDetailsCard
                key={index}
                index={index}
                ix={ix}
                programName={programName}
                childIndex={childIndex}
                innerCards={innerCards}
            />
        );
    }

    // `parsedTx` is non-null here by construction (it's built whenever `parsedIx`
    // is a ParsedInstruction, which the guards above guarantee). This guard exists
    // to narrow its type for the switch below — TS can't relate the two useMemos.
    if (!parsedTx) {
        return (
            <UnknownDetailsCard
                key={index}
                index={index}
                ix={ix}
                programName={programName}
                childIndex={childIndex}
                innerCards={innerCards}
            />
        );
    }

    // mpl-token-metadata / lighthouse below stay literal: dispatcher-only labels with no registry specimen (see ParserProgramLabel)
    switch (parsedIx.program) {
        case SYSTEM_PROGRAM_LABEL:
            return (
                <SystemDetailsCard
                    key={index}
                    ix={parsedIx}
                    tx={parsedTx}
                    index={index}
                    result={INSPECTOR_RESULT}
                    raw={ix}
                    childIndex={childIndex}
                    innerCards={innerCards}
                />
            );
        case SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_LABEL:
            return (
                <AssociatedTokenDetailsCard
                    key={index}
                    ix={parsedIx}
                    raw={ix}
                    index={index}
                    result={INSPECTOR_RESULT}
                    InstructionCardComponent={InspectorInstructionCardComponent}
                    AddressComponent={AddressWithContextCell}
                    showProgramField={false}
                    childIndex={childIndex}
                    innerCards={innerCards}
                />
            );
        case BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL:
            return (
                <ErrorBoundary
                    fallback={
                        <UnknownDetailsCard
                            key={index}
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    }
                >
                    <BpfUpgradeableLoaderDetailsCard
                        key={index}
                        ix={parsedIx}
                        tx={parsedTx}
                        index={index}
                        result={INSPECTOR_RESULT}
                        raw={ix}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                </ErrorBoundary>
            );
        case SPL_TOKEN_PROGRAM_LABEL:
            return (
                <ErrorBoundary
                    fallback={
                        <UnknownDetailsCard
                            key={index}
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    }
                >
                    <TokenDetailsCard
                        key={index}
                        ix={parsedIx}
                        tx={parsedTx}
                        index={index}
                        result={INSPECTOR_RESULT}
                        InstructionCardComponent={InspectorInstructionCardComponent}
                        raw={ix}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                </ErrorBoundary>
            );
        case SPL_TOKEN_2022_PROGRAM_LABEL:
            return (
                <ErrorBoundary
                    fallback={
                        <UnknownDetailsCard
                            key={index}
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    }
                >
                    <TokenDetailsCard
                        key={index}
                        ix={parsedIx}
                        tx={parsedTx}
                        index={index}
                        result={INSPECTOR_RESULT}
                        InstructionCardComponent={InspectorInstructionCardComponent}
                        raw={ix}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                </ErrorBoundary>
            );
        case 'mpl-token-metadata':
            return (
                <ErrorBoundary
                    fallback={
                        <UnknownDetailsCard
                            key={index}
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    }
                >
                    <MetaplexTokenMetadataDetailsCard
                        key={index}
                        ix={ix}
                        parsedIx={parsedIx}
                        index={index}
                        result={INSPECTOR_RESULT}
                        InstructionCardComponent={BaseInstructionCard}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                </ErrorBoundary>
            );
        case 'lighthouse':
            return (
                <ErrorBoundary
                    fallback={
                        <UnknownDetailsCard
                            key={index}
                            index={index}
                            ix={ix}
                            programName={programName}
                            childIndex={childIndex}
                            innerCards={innerCards}
                        />
                    }
                >
                    <LighthouseDetailsCard
                        key={index}
                        ix={parsedIx}
                        raw={ix}
                        index={index}
                        result={INSPECTOR_RESULT}
                        childIndex={childIndex}
                        innerCards={innerCards}
                    />
                </ErrorBoundary>
            );
    }

    return (
        <UnknownDetailsCard
            key={index}
            index={index}
            ix={ix}
            programName={programName}
            childIndex={childIndex}
            innerCards={innerCards}
        />
    );
}
