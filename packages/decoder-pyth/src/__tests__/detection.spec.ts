import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { isPythInstruction, resolvePythInstructionName } from '../detection';
import { PYTH_INSTRUCTION_TYPES, PYTH_INSTRUCTIONS } from '../instructions';
import { PYTH_ORACLE_PROGRAM_IDS } from '../program-ids';
import { KEYS, PYTH_PROGRAM, pythInstruction, rawPythInstruction, u32 } from './fixtures';

const FOREIGN_PROGRAM = new PublicKey('11111111111111111111111111111111');

describe('isPythInstruction', () => {
    it.each(Object.entries(PYTH_ORACLE_PROGRAM_IDS))('should match the %s deployment', (_cluster, programId) => {
        const ix = rawPythInstruction([...u32(2), ...u32(0)], new PublicKey(programId));
        expect(isPythInstruction(ix)).toBe(true);
    });

    it('should not match another program', () => {
        const ix = rawPythInstruction([...u32(2), ...u32(0)], FOREIGN_PROGRAM);
        expect(isPythInstruction(ix)).toBe(false);
    });
});

describe('resolvePythInstructionName', () => {
    // The name a card titles itself with is the name the CU chart and history resolve, so pin every one.
    it.each(PYTH_INSTRUCTION_TYPES)('should name %s', type => {
        const { data } = pythInstruction(type);
        expect(resolvePythInstructionName(PYTH_PROGRAM.toBase58(), data)).toBe(PYTH_INSTRUCTIONS[type].name);
    });

    it('should not name an instruction of another program', () => {
        const { data } = pythInstruction('UpdatePrice');
        expect(resolvePythInstructionName(FOREIGN_PROGRAM.toBase58(), data)).toBeUndefined();
    });

    it('should not name data too short to hold a header', () => {
        expect(resolvePythInstructionName(PYTH_PROGRAM.toBase58(), new Uint8Array(7))).toBeUndefined();
    });

    it('should not name an unsupported version', () => {
        const { data } = rawPythInstruction([...u32(1), ...u32(0)]);
        expect(resolvePythInstructionName(PYTH_PROGRAM.toBase58(), data)).toBeUndefined();
    });

    it('should not name an index no instruction uses', () => {
        const { data } = rawPythInstruction([...u32(2), ...u32(14)]);
        expect(resolvePythInstructionName(PYTH_PROGRAM.toBase58(), data)).toBeUndefined();
    });

    // The header is read through a DataView, which addresses the whole backing buffer unless the
    // view is offset — a sliced Buffer is exactly that case.
    it('should read the header of a view into a larger buffer', () => {
        const backing = Buffer.from([0xff, 0xff, ...u32(2), ...u32(7)]);
        const ix = new TransactionInstruction({
            data: backing.subarray(2),
            keys: KEYS,
            programId: PYTH_PROGRAM,
        });

        expect(resolvePythInstructionName(PYTH_PROGRAM.toBase58(), ix.data)).toBe(PYTH_INSTRUCTIONS.UpdatePrice.name);
    });
});
