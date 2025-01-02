import { TransactionInstruction } from '@solana/web3.js';

export const LIGHTHOUSE_ADDRESS = 'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95';

export function isLighthouseInstruction(instruction: TransactionInstruction): boolean {
    return instruction.programId.toBase58() === LIGHTHOUSE_ADDRESS;
}
