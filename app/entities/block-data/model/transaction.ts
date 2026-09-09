import { type Address, type CompiledTransactionMessage, decompileTransactionMessage } from '@solana/kit';

import type { BlockTransaction } from './types';

export function getBlockTransactionAccounts({ message, meta }: BlockTransaction): readonly Address[] {
    return [
        ...message.staticAccounts,
        ...(meta?.loadedAddresses?.writable ?? []),
        ...(meta?.loadedAddresses?.readonly ?? []),
    ];
}

export function getBlockTransactionInstructions(message: CompiledTransactionMessage) {
    if (message.version === 1) {
        return message.instructionHeaders.map((header, index) => {
            const payload = message.instructionPayloads[index];
            return {
                accountIndices: payload.instructionAccountIndices,
                data: new Uint8Array(payload.instructionData),
                programAddressIndex: header.programAccountIndex,
            };
        });
    }

    return message.instructions.map(instruction => ({
        accountIndices: instruction.accountIndices ?? [],
        data: new Uint8Array(instruction.data ?? []),
        programAddressIndex: instruction.programAddressIndex,
    }));
}

export function getBlockTransactionConfig(message: BlockTransaction['message']) {
    return message.version === 1 ? decompileTransactionMessage(message).config : undefined;
}

export function isBlockTransactionAccountWritable(transaction: BlockTransaction, accountIndex: number): boolean {
    const { message, meta } = transaction;
    const { numReadonlyNonSignerAccounts, numReadonlySignerAccounts, numSignerAccounts } = message.header;
    const staticAccountCount = message.staticAccounts.length;

    if (accountIndex < numSignerAccounts) {
        return accountIndex < numSignerAccounts - numReadonlySignerAccounts;
    }
    if (accountIndex < staticAccountCount) {
        return accountIndex < staticAccountCount - numReadonlyNonSignerAccounts;
    }

    return accountIndex < staticAccountCount + (meta?.loadedAddresses?.writable.length ?? 0);
}
