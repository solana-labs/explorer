import {
    InstructionCardView,
    type InstructionNode,
    ProgramField,
    useInstructionSurface,
} from '@entities/instruction-card';
import { AccountMeta } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { capitalizeFirstLetter } from '@utils/index';
import {
    identifySolanaAttestationServiceInstruction,
    parseChangeAuthorizedSignersInstruction,
    parseChangeSchemaDescriptionInstruction,
    parseChangeSchemaStatusInstruction,
    parseChangeSchemaVersionInstruction,
    parseCloseAttestationInstruction,
    parseCloseTokenizedAttestationInstruction,
    parseCreateAttestationInstruction,
    parseCreateCredentialInstruction,
    parseCreateSchemaInstruction,
    parseCreateTokenizedAttestationInstruction,
    parseEmitEventInstruction,
    parseTokenizeSchemaInstruction,
    SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS as SAS_PROGRAM_ID,
    SolanaAttestationServiceInstruction,
} from 'sas-lib';

import { toKitInstruction } from '@/app/shared/lib/web3js-compat';
import { BaseTable } from '@/app/shared/ui/Table';

import { mapCodamaIxArgsToRows } from '../codama/codamaUtils';

export function isSolanaAttestationInstruction(transactionIx: TransactionInstruction) {
    return transactionIx.programId.toBase58() === SAS_PROGRAM_ID;
}

/** Every SAS instruction parses to accounts plus an argument struct; only the struct's shape differs. */
type ParsedSasInstruction = {
    accounts: Record<string, AccountMeta>;
    data: Record<string, unknown>;
};

const SECTION_ROW_CLASS =
    'bg-dark-background text-dk-xs font-semibold uppercase tracking-[0.08em] text-dark-muted-foreground';

/** Counts the discriminator the struct always carries, so a single argument still reads as none. */
const ARGUMENT_KEY_THRESHOLD = 2;

/**
 * Draws its own rows rather than declaring `InstructionField` descriptors: the argument
 * table is three columns wide (name, type, value) and generated from a Codama struct, so
 * the account rows have to span the extra column to stay flush right.
 */
export function SolanaAttestationDetailsCard({
    ix,
    index,
    innerCards,
    childIndex,
}: {
    ix: TransactionInstruction;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const node: InstructionNode = { childIndex, index, innerCards, ix, programId: ix.programId };
    const { Address, showProgramField } = useInstructionSurface();
    const { name, parsed } = parseSolanaAttestationInstruction(ix);
    const hasArguments = Object.keys(parsed.data).length > ARGUMENT_KEY_THRESHOLD;

    return (
        <InstructionCardView node={node} title={`Solana Attestation: ${name}`}>
            {showProgramField && <ProgramField programId={node.programId} colSpan={2} />}
            <BaseTable.Row className={SECTION_ROW_CLASS}>
                <BaseTable.Cell>Account Name</BaseTable.Cell>
                <BaseTable.Cell className="text-right" colSpan={2}>
                    Address
                </BaseTable.Cell>
            </BaseTable.Row>
            {Object.entries(parsed.accounts).map(([accountName, account]) => (
                <BaseTable.Row key={accountName}>
                    <BaseTable.Cell>{capitalizeFirstLetter(accountName)}</BaseTable.Cell>
                    <BaseTable.Cell className="text-right" colSpan={2}>
                        <Address pubkey={new PublicKey(account.address)} />
                    </BaseTable.Cell>
                </BaseTable.Row>
            ))}

            {hasArguments && (
                <>
                    <BaseTable.Row className={SECTION_ROW_CLASS}>
                        <BaseTable.Cell>Argument Name</BaseTable.Cell>
                        <BaseTable.Cell>Type</BaseTable.Cell>
                        <BaseTable.Cell className="text-right">Value</BaseTable.Cell>
                    </BaseTable.Row>
                    {mapCodamaIxArgsToRows(parsed.data)}
                </>
            )}
        </InstructionCardView>
    );
}

/** Throws for an instruction the program does not define; the caller's error boundary owns the fallback. */
function parseSolanaAttestationInstruction(ix: TransactionInstruction): {
    name: string;
    parsed: ParsedSasInstruction;
} {
    const kitIx = toKitInstruction(ix);

    switch (identifySolanaAttestationServiceInstruction(ix)) {
        case SolanaAttestationServiceInstruction.CreateCredential:
            return { name: 'Create Credential', parsed: parseCreateCredentialInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.CreateSchema:
            return { name: 'Create Schema', parsed: parseCreateSchemaInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.ChangeSchemaStatus:
            return { name: 'Change Schema Status', parsed: parseChangeSchemaStatusInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.ChangeAuthorizedSigners:
            return { name: 'Change Authorized Signers', parsed: parseChangeAuthorizedSignersInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.ChangeSchemaDescription:
            return { name: 'Change Schema Description', parsed: parseChangeSchemaDescriptionInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.ChangeSchemaVersion:
            return { name: 'Change Schema Version', parsed: parseChangeSchemaVersionInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.CreateAttestation:
            return { name: 'Create Attestation', parsed: parseCreateAttestationInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.CloseAttestation:
            return { name: 'Close Attestation', parsed: parseCloseAttestationInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.EmitEvent:
            return { name: 'Emit Event', parsed: parseEmitEventInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.TokenizeSchema:
            return { name: 'Tokenize Schema', parsed: parseTokenizeSchemaInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.CreateTokenizedAttestation:
            return { name: 'Create Tokenized Attestation', parsed: parseCreateTokenizedAttestationInstruction(kitIx) };
        case SolanaAttestationServiceInstruction.CloseTokenizedAttestation:
            return { name: 'Close Tokenized Attestation', parsed: parseCloseTokenizedAttestationInstruction(kitIx) };
    }
}
