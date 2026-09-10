import { TransactionInstruction } from '@solana/web3.js';

const PROGRAM_ADDRESS = 'Ed25519SigVerify111111111111111111111111111';

export function isEd25519Instruction(instruction: TransactionInstruction): boolean {
    return PROGRAM_ADDRESS === instruction.programId.toBase58();
}
