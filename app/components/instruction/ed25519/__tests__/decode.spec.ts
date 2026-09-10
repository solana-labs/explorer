import { getBase58Decoder } from '@solana/kit';
import { ParsedTransaction, PublicKey } from '@solana/web3.js';

import { toBase64 } from '@/app/shared/lib/bytes';

import { decodeEd25519Offsets, resolveEd25519Signatures } from '../decode';

const BASE58_DECODER = getBase58Decoder();

/** The index the program reserves for "the bytes are in this instruction". */
const SELF = 0xffff;

/**
 * 56JcSVYUPr8hdg8q2bfDhiPm5W9XQtr45VEevK9ye6Ec7DcyvD9CvnDgUoQhL3eQEmz32RRtLcaRdU9xyaDyCLiT
 * (devnet) — one signature, every field pointing into the instruction at index 1.
 */
const CROSS_REFERENCE = fromHex('01000c0001004c0001006e008a000100');

const REFERENCED_NEIGHBOUR = fromHex(
    '3259784efe0f688cec00000037d6acf4b3c9628b3485f398ed7baa20c37c4dff8ebee937456adea100d27c923e097cb0f41c9ff752efc7ed06db3c28bcf867f3ca203cde9222e72d1e93d503395311d51c1b87fd56c3b5872d1041111e51f399b12d291d981a0ea3834072958a00303030313031303034303432306630303030303030303030303030303030303030303030303030303031303030303030303030303030303030303031633830313939353235653733313730303030303030313330646465643337313730303030303030303030633866373165313530303030303030303334373337303431353433343533343830303030',
);

/**
 * XBHwdBYNu8J326yKeHiRyEudMaFVhz3Pb6ahgcfceRLV6kbmd14Z8vE6YnV4zu5WWNESmvhxmjUj4CpoQmwwhLJ —
 * one signature carrying its own signature, key and message.
 */
const SELF_CONTAINED = fromHex(
    '01003000ffff1000ffff70002000ffff8f2ed8bcd09b724040a0fc59ce9b5ea78525b6054def83d68f3a3930aa76e5bd4c105e1989c4d276372c97a5efb79d89bcc78f094f155be1b369e62e8b7eb42f42b3341f6be3b5c6f13a176fd7ca32323bf759c547126117365dccdae56e180f07932bbeab087035132975788c9af2a2c1a63e371e0866efcdb5a1952a1d2422',
);

/** The same instruction with each 0xffff self-reference bumped to an index no transaction has. */
const DANGLING_REFERENCE = fromHex(
    '01003000fffe1000fffe70002000fffe8f2ed8bcd09b724040a0fc59ce9b5ea78525b6054def83d68f3a3930aa76e5bd4c105e1989c4d276372c97a5efb79d89bcc78f094f155be1b369e62e8b7eb42f42b3341f6be3b5c6f13a176fd7ca32323bf759c547126117365dccdae56e180f07932bbeab087035132975788c9af2a2c1a63e371e0866efcdb5a1952a1d2422',
);

describe('decodeEd25519Offsets', () => {
    it('should read every offset of a self-contained signature', () => {
        expect(decodeEd25519Offsets(SELF_CONTAINED)).toEqual([
            {
                messageDataOffset: 112,
                messageDataSize: 32,
                messageInstructionIndex: SELF,
                publicKeyInstructionIndex: SELF,
                publicKeyOffset: 16,
                signatureInstructionIndex: SELF,
                signatureOffset: 48,
            },
        ]);
    });

    it('should read one struct per signature the count declares', () => {
        const twoSignatures = new Uint8Array([2, 0, ...new Array(28).fill(0)]);

        expect(decodeEd25519Offsets(twoSignatures)).toHaveLength(2);
    });

    it('should return nothing for an empty instruction', () => {
        expect(decodeEd25519Offsets(new Uint8Array())).toEqual([]);
    });

    // The count is the first byte of attacker-supplied data, so reading it must not overrun the rest.
    it('should stop at the data rather than at a count that overruns it', () => {
        const overstatedCount = new Uint8Array([255, 0, ...new Array(14).fill(0)]);

        expect(decodeEd25519Offsets(overstatedCount)).toHaveLength(1);
    });
});

describe('resolveEd25519Signatures', () => {
    it('should read the bytes out of this instruction when the offsets point at it', () => {
        const [{ signature, publicKey, message }] = resolveEd25519Signatures(
            transaction(SELF_CONTAINED),
            SELF_CONTAINED,
        );

        expect(signature.instructionIndex).toBeUndefined();
        expect(signature.offset).toBe(48);
        expect(base64(signature.bytes)).toBe(
            'TBBeGYnE0nY3LJel77edibzHjwlPFVvhs2nmLot+tC9CszQfa+O1xvE6F2/XyjIyO/dZxUcSYRc2Xcza5W4YDw==',
        );
        expect(publicKey.pubkey).toEqual(new PublicKey('AdvjU3gzNNXxASXEKBHovk3xAjFxQVn1UX6fUdgSvnS8'));
        expect(message.size).toBe(32);
        expect(base64(message.bytes)).toBe('B5MrvqsIcDUTKXV4jJryosGmPjceCGbvzbWhlSodJCI=');
    });

    it('should read the bytes out of the instruction the offsets name', () => {
        const [{ signature, publicKey, message }] = resolveEd25519Signatures(
            transaction(CROSS_REFERENCE, REFERENCED_NEIGHBOUR),
            CROSS_REFERENCE,
        );

        expect(signature.instructionIndex).toBe(1);
        expect(base64(signature.bytes)).toBe(
            'N9as9LPJYos0hfOY7XuqIMN8Tf+Ovuk3RWreoQDSfJI+CXyw9Byf91Lvx+0G2zwovPhn88ogPN6SIuctHpPVAw==',
        );
        expect(publicKey.pubkey).toEqual(new PublicKey('4rmhwytmKH1XsgGAUyUUH7U64HS5FtT6gM8HGKAfwcFE'));
        expect(message.instructionIndex).toBe(1);
        expect(message.offset).toBe(110);
        expect(message.size).toBe(138);
    });

    it('should resolve nothing for an instruction index the transaction does not have', () => {
        const [{ signature, publicKey, message }] = resolveEd25519Signatures(
            transaction(DANGLING_REFERENCE),
            DANGLING_REFERENCE,
        );

        expect(signature.bytes).toBeUndefined();
        expect(publicKey.pubkey).toBeUndefined();
        expect(message.bytes).toBeUndefined();
    });

    // Building a PublicKey from a short slice throws, which would take the whole card down.
    it('should resolve no public key when the reference lands on fewer than 32 bytes', () => {
        const keyOffsetPastTheEnd = new Uint8Array([
            1, 0, 48, 0, 0xff, 0xff, 0xf0, 0xff, 0xff, 0xff, 112, 0, 32, 0, 0xff, 0xff,
        ]);

        const [{ publicKey }] = resolveEd25519Signatures(transaction(keyOffsetPastTheEnd), keyOffsetPastTheEnd);

        expect(publicKey.pubkey).toBeUndefined();
    });
});

function fromHex(hex: string): Uint8Array {
    return Buffer.from(hex, 'hex');
}

function base64(bytes: Uint8Array | undefined): string | undefined {
    return bytes && toBase64(bytes);
}

/** The ed25519 instruction sits at index 0; any neighbour it references follows it. */
function transaction(ed25519Data: Uint8Array, ...neighbourData: Uint8Array[]): ParsedTransaction {
    return {
        message: {
            accountKeys: [],
            instructions: [
                { data: ed25519Data },
                ...neighbourData.map(data => ({ data: BASE58_DECODER.decode(data) })),
            ],
            recentBlockhash: '11111111111111111111111111111111',
        },
        signatures: [],
    } as unknown as ParsedTransaction;
}
