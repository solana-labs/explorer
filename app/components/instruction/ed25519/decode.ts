import { getBase58Encoder } from '@solana/kit';
import { ParsedTransaction, PublicKey } from '@solana/web3.js';

import { readUint8, readUint16LE } from '@/app/shared/lib/bytes';

const BASE58_ENCODER = getBase58Encoder();

/** The program's stand-in for "the bytes are in this instruction". */
const SELF_REFERENCE_INSTRUCTION_INDEX = 65535;

/** One Ed25519SignatureOffsets struct. */
const OFFSETS_SIZE = 14;

const SIGNATURE_SIZE = 64;
const PUBLIC_KEY_SIZE = 32;

export type Ed25519SignatureOffsets = {
    signatureOffset: number;
    signatureInstructionIndex: number;
    publicKeyOffset: number;
    publicKeyInstructionIndex: number;
    messageDataOffset: number;
    messageDataSize: number;
    messageInstructionIndex: number;
};

/** Where a field's bytes live. `instructionIndex` is absent when they are in the ed25519 instruction itself. */
type Ed25519Reference = {
    instructionIndex?: number;
    offset: number;
};

export type Ed25519SignatureDetails = {
    signature: Ed25519Reference & { bytes?: Uint8Array };
    /**
     * Resolved here rather than in the card: a reference may land on fewer than 32
     * bytes, which is not a key, and building one from those would throw mid-render.
     */
    publicKey: Ed25519Reference & { pubkey?: PublicKey };
    message: Ed25519Reference & { size: number; bytes?: Uint8Array };
};

// See https://docs.anza.xyz/runtime/programs/#ed25519-program
export function decodeEd25519Offsets(data: Uint8Array): Ed25519SignatureOffsets[] {
    const count = readUint8(data, 0);
    const offsets: Ed25519SignatureOffsets[] = [];

    // Skip the count and the padding byte after it.
    let cursor = 2;

    // The count is attacker-controlled, so stop at whatever the data actually holds.
    for (let i = 0; i < count && cursor + OFFSETS_SIZE <= data.length; i++) {
        offsets.push({
            messageDataOffset: readUint16LE(data, cursor + 8),
            messageDataSize: readUint16LE(data, cursor + 10),
            messageInstructionIndex: readUint16LE(data, cursor + 12),
            publicKeyInstructionIndex: readUint16LE(data, cursor + 6),
            publicKeyOffset: readUint16LE(data, cursor + 4),
            signatureInstructionIndex: readUint16LE(data, cursor + 2),
            signatureOffset: readUint16LE(data, cursor),
        });
        cursor += OFFSETS_SIZE;
    }

    return offsets;
}

/**
 * Follows every offset to the bytes it names. Each one points either into this
 * instruction's data or into another instruction's, which is why the whole
 * transaction is needed to read a single ed25519 instruction.
 */
export function resolveEd25519Signatures(tx: ParsedTransaction, data: Uint8Array): Ed25519SignatureDetails[] {
    return decodeEd25519Offsets(data).map(offsets => ({
        message: {
            bytes: readReferencedBytes(
                tx,
                data,
                offsets.messageInstructionIndex,
                offsets.messageDataOffset,
                offsets.messageDataSize,
            ),
            instructionIndex: referencedInstruction(offsets.messageInstructionIndex),
            offset: offsets.messageDataOffset,
            size: offsets.messageDataSize,
        },
        publicKey: {
            instructionIndex: referencedInstruction(offsets.publicKeyInstructionIndex),
            offset: offsets.publicKeyOffset,
            pubkey: toPublicKey(
                readReferencedBytes(
                    tx,
                    data,
                    offsets.publicKeyInstructionIndex,
                    offsets.publicKeyOffset,
                    PUBLIC_KEY_SIZE,
                ),
            ),
        },
        signature: {
            bytes: readReferencedBytes(
                tx,
                data,
                offsets.signatureInstructionIndex,
                offsets.signatureOffset,
                SIGNATURE_SIZE,
            ),
            instructionIndex: referencedInstruction(offsets.signatureInstructionIndex),
            offset: offsets.signatureOffset,
        },
    }));
}

function referencedInstruction(instructionIndex: number): number | undefined {
    return instructionIndex === SELF_REFERENCE_INSTRUCTION_INDEX ? undefined : instructionIndex;
}

function readReferencedBytes(
    tx: ParsedTransaction,
    own: Uint8Array,
    instructionIndex: number,
    offset: number,
    length: number,
): Uint8Array | undefined {
    if (instructionIndex === SELF_REFERENCE_INSTRUCTION_INDEX) {
        return own.slice(offset, offset + length);
    }

    const target = tx.message.instructions[instructionIndex];
    // An RPC-parsed neighbour carries no wire data, so its offsets cannot be followed.
    if (!target || !('data' in target)) {
        return undefined;
    }

    try {
        return BASE58_ENCODER.encode(target.data).slice(offset, offset + length);
    } catch {
        return undefined;
    }
}

function toPublicKey(bytes: Uint8Array | undefined): PublicKey | undefined {
    if (bytes?.length !== PUBLIC_KEY_SIZE) {
        return undefined;
    }
    return new PublicKey(bytes);
}
