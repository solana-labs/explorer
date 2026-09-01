import { type TransactionInstruction } from '@solana/web3.js';

import { PYTH_HEADER_SIZE, PYTH_INSTRUCTION_VERSION, PYTH_INSTRUCTIONS, pythInstructionTypeAt } from './instructions';
import { PYTH_PROGRAM_IDS } from './program-ids';

const programIds = new Set<string>(PYTH_PROGRAM_IDS);

export const isPythInstruction = (instruction: TransactionInstruction): boolean =>
    programIds.has(instruction.programId.toBase58());

// Pyth heads every instruction with a u32 LE version followed by a u32 LE instruction index.
const readHeader = (data: Uint8Array): { index: number; version: number } => {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { index: view.getUint32(4, true), version: view.getUint32(0, true) };
};

// Name-only resolver for the NAME_SOURCES chain: program-id-gated and never throws, so it composes with other resolvers.
export const resolvePythInstructionName = (programId: string, data: Uint8Array): string | undefined => {
    if (!programIds.has(programId) || data.byteLength < PYTH_HEADER_SIZE) return undefined;

    const { index, version } = readHeader(data);
    if (version !== PYTH_INSTRUCTION_VERSION) return undefined;

    const type = pythInstructionTypeAt(index);
    if (type === undefined) return undefined;
    return PYTH_INSTRUCTIONS[type].name;
};

export { PYTH_ORACLE_PROGRAM_IDS, PYTH_ORACLE_PROGRAM_LABEL } from './program-ids';
