import { PublicKey, TransactionInstruction } from '@solana/web3.js';

import { PYTH_INSTRUCTION_VERSION, PYTH_INSTRUCTIONS, type PythInstructionType } from '../instructions';
import { PYTH_ORACLE_PROGRAM_IDS } from '../program-ids';

export const PYTH_PROGRAM = new PublicKey(PYTH_ORACLE_PROGRAM_IDS.mainnet);

export const ACCOUNTS = {
    first: 'FagABcRBhZH27JDtu6A1Jo9woXyoznP28QujLkxkN9Hj',
    second: '7txXZZD6Um59YoLMF7XUNimbMjsqsWhc7g2EniiTrmp1',
    third: 'GgU1RSCbCTNfjPqBGnR7NBDZoLQwB7oEjnHqzGtcCLBH',
} as const;

export const KEYS = Object.values(ACCOUNTS).map(key => ({
    isSigner: false,
    isWritable: false,
    pubkey: new PublicKey(key),
}));

export const PUBLISHER = new PublicKey('4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi');

export function u32(value: number): number[] {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return [...bytes];
}

export function u64(value: bigint): number[] {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, value, true);
    return [...bytes];
}

export function i64(value: bigint): number[] {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigInt64(0, value, true);
    return [...bytes];
}

/** A uint8 length-prefixed UTF-8 string, as the Pyth product attribute list encodes them. */
export function lpString(value: string): number[] {
    const bytes = new TextEncoder().encode(value);
    return [bytes.length, ...bytes];
}

/** An instruction of `type`, headed by the version the oracle ships. */
export function pythInstruction(type: PythInstructionType, ...payload: number[][]): TransactionInstruction {
    return rawPythInstruction([
        ...u32(PYTH_INSTRUCTION_VERSION),
        ...u32(PYTH_INSTRUCTIONS[type].index),
        ...payload.flat(),
    ]);
}

/** Header bytes spelled out, for the versions and indexes `pythInstruction` cannot express. */
export function rawPythInstruction(data: number[], programId: PublicKey = PYTH_PROGRAM): TransactionInstruction {
    return new TransactionInstruction({ data: Buffer.from(data), keys: KEYS, programId });
}
