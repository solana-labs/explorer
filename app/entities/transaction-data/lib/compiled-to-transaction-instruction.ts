import { getBase58Encoder } from '@solana/kit';
import {
    type AccountMeta,
    type CompiledInstruction,
    type MessageAccountKeys,
    TransactionInstruction,
    type VersionedMessage,
} from '@solana/web3.js';

import { Logger } from '@/app/shared/lib/logger';

const BASE58_ENCODER = getBase58Encoder();

// Converts a CompiledInstruction (index-based) into a TransactionInstruction
// (pubkey-based) using VersionedMessage helpers for signer/writable resolution.
// Returns undefined if any account index is out of range.
export function compiledToTransactionInstruction(
    ix: CompiledInstruction,
    accountKeys: MessageAccountKeys,
    message: VersionedMessage,
): TransactionInstruction | undefined {
    const programId = accountKeys.get(ix.programIdIndex);
    if (!programId) {
        Logger.warn('[transaction-data] Program ID index out of range', {
            index: ix.programIdIndex,
            total: accountKeys.length,
        });
        return undefined;
    }

    const keys: AccountMeta[] = [];
    for (const accountIndex of ix.accounts) {
        const pubkey = accountKeys.get(accountIndex);
        if (!pubkey) {
            Logger.warn('[transaction-data] Account index out of range', {
                index: accountIndex,
                total: accountKeys.length,
            });
            return undefined;
        }
        keys.push({
            isSigner: message.isAccountSigner(accountIndex),
            isWritable: message.isAccountWritable(accountIndex),
            pubkey,
        });
    }

    return new TransactionInstruction({
        data: Buffer.from(BASE58_ENCODER.encode(ix.data)),
        keys,
        programId,
    });
}
