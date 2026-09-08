import type { BlockTransaction } from '@entities/block-data';
import { address, blockhash, lamports } from '@solana/kit';

import {
    getBlockTransactionAccounts,
    getBlockTransactionInstructions,
    isBlockTransactionAccountWritable,
} from '../transaction';

const ADDRESSES = [
    address('11111111111111111111111111111111'),
    address('Vote111111111111111111111111111111111111111'),
    address('Stake11111111111111111111111111111111111111'),
    address('ComputeBudget111111111111111111111111111111'),
    address('So11111111111111111111111111111111111111112'),
    address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
] as const;

function createV0Transaction(): BlockTransaction {
    return {
        index: 0,
        message: {
            header: { numReadonlyNonSignerAccounts: 1, numReadonlySignerAccounts: 1, numSignerAccounts: 2 },
            instructions: [{ accountIndices: [0, 2, 4, 5], data: new Uint8Array([1, 2]), programAddressIndex: 3 }],
            lifetimeToken: blockhash('11111111111111111111111111111111'),
            staticAccounts: ADDRESSES.slice(0, 4),
            version: 0,
        },
        meta: {
            err: null,
            fee: lamports(0n),
            loadedAddresses: { readonly: [ADDRESSES[5]], writable: [ADDRESSES[4]] },
            logMessages: [],
        },
        signatures: [],
    };
}

describe('block transaction helpers', () => {
    it('should combine kit static and loaded addresses in runtime index order', () => {
        expect(getBlockTransactionAccounts(createV0Transaction())).toEqual(ADDRESSES);
    });

    it('should derive writable roles from the kit message header and loaded-address segments', () => {
        const transaction = createV0Transaction();
        expect(ADDRESSES.map((_, index) => isBlockTransactionAccountWritable(transaction, index))).toEqual([
            true,
            false,
            true,
            false,
            true,
            false,
        ]);
    });

    it('should normalize legacy and v0 compiled instructions', () => {
        expect(getBlockTransactionInstructions(createV0Transaction().message)).toEqual([
            { accountIndices: [0, 2, 4, 5], data: new Uint8Array([1, 2]), programAddressIndex: 3 },
        ]);
    });

    it('should pair v1 instruction headers with their payloads', () => {
        const message: BlockTransaction['message'] = {
            configMask: 0,
            configValues: [],
            header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 1 },
            instructionHeaders: [{ numInstructionAccounts: 2, numInstructionDataBytes: 2, programAccountIndex: 1 }],
            instructionPayloads: [{ instructionAccountIndices: [0, 2], instructionData: new Uint8Array([3, 4]) }],
            lifetimeToken: blockhash('11111111111111111111111111111111'),
            numInstructions: 1,
            numStaticAccounts: 3,
            staticAccounts: ADDRESSES.slice(0, 3),
            version: 1,
        };

        expect(getBlockTransactionInstructions(message)).toEqual([
            { accountIndices: [0, 2], data: new Uint8Array([3, 4]), programAddressIndex: 1 },
        ]);
    });
});
