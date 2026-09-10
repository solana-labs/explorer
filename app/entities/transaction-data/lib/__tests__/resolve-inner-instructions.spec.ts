import { getBase58Decoder } from '@solana/kit';
import { Keypair, MessageAccountKeys, MessageV0, PublicKey } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { resolveInnerInstructions } from '../resolve-inner-instructions';

const BASE58_DECODER = getBase58Decoder();

describe('resolveInnerInstructions', () => {
    it('should group inner instructions by parent index', () => {
        const keys = makeKeys(3);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 1,
            numRequiredSignatures: 1,
        });

        const result = resolveInnerInstructions(
            [{ index: 0, instructions: [{ accounts: [0, 1], data: encodeData([1, 2, 3]), programIdIndex: 2 }] }],
            new MessageAccountKeys(keys),
            message,
        );

        expect(result.get(0)).toHaveLength(1);
        expect(result.get(0)?.[0]?.programId).toEqual(keys[2]);
        expect(result.get(0)?.[0]?.data).toEqual(Buffer.from([1, 2, 3]));
    });

    it('should keep every inner instruction, whatever program it targets', () => {
        const keys = makeKeys(4);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 2,
            numRequiredSignatures: 1,
        });

        const result = resolveInnerInstructions(
            [
                {
                    index: 0,
                    instructions: [
                        { accounts: [0], data: encodeData([1]), programIdIndex: 2 },
                        { accounts: [1], data: encodeData([2]), programIdIndex: 3 },
                    ],
                },
            ],
            new MessageAccountKeys(keys),
            message,
        );

        expect(result.get(0)).toHaveLength(2);
        expect(result.get(0)?.map(ix => ix?.programId)).toEqual([keys[2], keys[3]]);
    });

    it('should resolve signer and writable flags from the message', () => {
        // 5 accounts: [0] writable signer, [1] readonly signer, [2] writable unsigned,
        // [3] readonly unsigned, [4] the invoked program.
        const keys = makeKeys(5);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 1,
            numReadonlyUnsignedAccounts: 2,
            numRequiredSignatures: 2,
        });

        const result = resolveInnerInstructions(
            [{ index: 0, instructions: [{ accounts: [0, 1, 2, 3], data: encodeData([0]), programIdIndex: 4 }] }],
            new MessageAccountKeys(keys),
            message,
        );

        const ix = result.get(0)?.[0];
        expect(ix?.keys[0]).toMatchObject({ isSigner: true, isWritable: true });
        expect(ix?.keys[1]).toMatchObject({ isSigner: true, isWritable: false });
        expect(ix?.keys[2]).toMatchObject({ isSigner: false, isWritable: true });
        expect(ix?.keys[3]).toMatchObject({ isSigner: false, isWritable: false });
    });

    it('should handle multiple parent indices', () => {
        const keys = makeKeys(3);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 1,
            numRequiredSignatures: 1,
        });
        const instruction = { accounts: [0, 1], data: encodeData([7]), programIdIndex: 2 };

        const result = resolveInnerInstructions(
            [
                { index: 1, instructions: [instruction] },
                { index: 3, instructions: [instruction] },
            ],
            new MessageAccountKeys(keys),
            message,
        );

        expect([...result.keys()]).toEqual([1, 3]);
        expect(result.get(1)).toHaveLength(1);
        expect(result.get(3)).toHaveLength(1);
    });

    it('should keep the position of an instruction it cannot resolve', () => {
        const keys = makeKeys(3);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 1,
            numRequiredSignatures: 1,
        });

        const result = resolveInnerInstructions(
            [
                {
                    index: 0,
                    instructions: [
                        { accounts: [0], data: encodeData([1]), programIdIndex: 2 },
                        { accounts: [0, 99], data: encodeData([2]), programIdIndex: 2 },
                        { accounts: [1], data: encodeData([3]), programIdIndex: 2 },
                    ],
                },
            ],
            new MessageAccountKeys(keys),
            message,
        );

        // The unresolvable child holds its slot, so the third one is still numbered third.
        expect(result.get(0)).toHaveLength(3);
        expect(result.get(0)?.[1]).toBeUndefined();
        expect(result.get(0)?.[2]?.data).toEqual(Buffer.from([3]));
    });

    it('should not resolve an instruction whose program id index is out of range', () => {
        const keys = makeKeys(2);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
            numRequiredSignatures: 1,
        });

        const result = resolveInnerInstructions(
            [{ index: 0, instructions: [{ accounts: [0], data: encodeData([1]), programIdIndex: 99 }] }],
            new MessageAccountKeys(keys),
            message,
        );

        expect(result.get(0)).toEqual([undefined]);
    });

    it('should return an empty object for empty input', () => {
        const keys = makeKeys(2);
        const message = makeMessage(keys, {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
            numRequiredSignatures: 1,
        });

        expect(resolveInnerInstructions([], new MessageAccountKeys(keys), message).size).toBe(0);
    });
});

// Builds a minimal MessageV0 with the given static keys and header.
function makeMessage(
    keys: PublicKey[],
    header: { numRequiredSignatures: number; numReadonlySignedAccounts: number; numReadonlyUnsignedAccounts: number },
): MessageV0 {
    return new MessageV0({
        addressTableLookups: [],
        compiledInstructions: [],
        header,
        recentBlockhash: BASE58_DECODER.decode(new Uint8Array(32)),
        staticAccountKeys: keys,
    });
}

function makeKeys(count: number): PublicKey[] {
    return Array.from({ length: count }, () => Keypair.generate().publicKey);
}

function encodeData(bytes: number[]): string {
    return BASE58_DECODER.decode(new Uint8Array(bytes));
}
