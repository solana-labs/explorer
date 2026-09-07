import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { fromBase64Url } from '@/app/shared/lib/bytes';
import { invariant } from '@/app/shared/lib/invariant';

import { base64TxSearchProvider } from '../base64-tx-search-provider';
import { createSearchContext } from './provider-test-utils';

const ctx = createSearchContext();

describe('base64TxSearchProvider', () => {
    it('should have kind "fallback"', () => {
        expect(base64TxSearchProvider.kind).toBe('fallback');
    });

    it('should return an inspector link for a base64-encoded transaction', async () => {
        const b64 = createBase64Transaction();
        const results = await base64TxSearchProvider.search(b64, ctx);

        expect(results).toHaveLength(1);
        expect(results[0].label).toBe('Transaction Inspector');
        expect(results[0].options[0].label).toBe('Inspect Decoded Transaction');
        expect(results[0].options[0].pathname).toContain('/tx/inspector?');
        expect(results[0].options[0].pathname).toContain('message=');
        expect(results[0].options[0].value).toEqual([b64]);
    });

    it('should produce a message param that round-trips to the original message bytes', async () => {
        const messageBytes = createMessageBytes();
        const b64 = Buffer.from(messageBytes).toString('base64');
        const results = await base64TxSearchProvider.search(b64, ctx);
        const params = extractParams(results[0].options[0].pathname);
        const messageParam = params.get('message');
        invariant(messageParam, 'expected message param in inspector URL');
        const decodedMessage = fromBase64Url(messageParam);

        expect(decodedMessage).toEqual(messageBytes);
    });

    it('should include signatures as a JSON array of strings', async () => {
        const b64 = createBase64Transaction({ sign: true });
        const results = await base64TxSearchProvider.search(b64, ctx);
        const params = extractParams(results[0].options[0].pathname);
        const raw = params.get('signatures');
        if (!raw) throw new Error('Expected signatures param to be present');
        const signatures: string[] = JSON.parse(raw);

        expect(Array.isArray(signatures)).toBe(true);
        expect(signatures).toHaveLength(1);
        expect(typeof signatures[0]).toBe('string');
    });

    it('should omit signatures param for unsigned transactions', async () => {
        const b64 = createBase64Transaction();
        const results = await base64TxSearchProvider.search(b64, ctx);
        const params = extractParams(results[0].options[0].pathname);

        expect(params.has('signatures')).toBe(false);
    });

    it('should accept unpadded base64 input', async () => {
        const b64 = createBase64Transaction();
        // Strip trailing '=' padding
        // eslint-disable-next-line no-restricted-syntax -- stripping trailing '=' padding from base64; regex is the clearest way to match variable-length suffix
        const unpadded = b64.replace(/=+$/, '');
        const results = await base64TxSearchProvider.search(unpadded, ctx);

        expect(results).toHaveLength(1);
        expect(results[0].options[0].pathname).toContain('/tx/inspector?');
    });

    it('should return an inspector link for a bare message (no signatures)', async () => {
        const messageBytes = createMessageBytes();
        const b64 = Buffer.from(messageBytes).toString('base64');
        const results = await base64TxSearchProvider.search(b64, ctx);

        expect(results).toHaveLength(1);
        const params = extractParams(results[0].options[0].pathname);
        expect(params.has('message')).toBe(true);
        expect(params.has('signatures')).toBe(false);
    });

    it('should not double-encode the message param', async () => {
        const messageBytes = createMessageBytes();
        const b64 = Buffer.from(messageBytes).toString('base64');
        const results = await base64TxSearchProvider.search(b64, ctx);
        const params = extractParams(results[0].options[0].pathname);
        const message = params.get('message');
        invariant(message, 'expected message param in inspector URL');

        // A double-encoded value would contain '%25' (the encoding of '%')
        expect(message).not.toContain('%25');
        expect(message).not.toContain('+');
        expect(message).not.toContain('/');
        expect(message).not.toContain('=');
        expect(fromBase64Url(message)).toEqual(messageBytes);
    });

    describe('rejection cases', () => {
        it('should return empty for valid bs58 input (e.g. a pubkey)', async () => {
            const pubkey = Keypair.generate().publicKey.toBase58();
            expect(await base64TxSearchProvider.search(pubkey, ctx)).toEqual([]);
        });

        it('should return empty for invalid base64', async () => {
            expect(await base64TxSearchProvider.search('!!!not-valid!!!', ctx)).toEqual([]);
        });

        it('should return empty when atob throws on non-base64 characters', async () => {
            // Unicode characters outside the base64 alphabet cause atob to throw
            expect(await base64TxSearchProvider.search('ñoño+café==', ctx)).toEqual([]);
        });

        it('should return empty when base64 round-trip check fails', async () => {
            // 70 zero-bytes encode to valid base64. Tweaking the last
            // data character ('q' → 'x') changes trailing bits so the
            // decoded bytes re-encode to a different string.
            const valid = Buffer.alloc(70, 0xab).toString('base64');
            const corrupted = `${valid.slice(0, -4)}qx==`;
            expect(await base64TxSearchProvider.search(corrupted, ctx)).toEqual([]);
        });

        it('should return empty for a string with whitespace', async () => {
            expect(await base64TxSearchProvider.search('  ', ctx)).toEqual([]);
        });
    });

    it('should return empty for base64 that is too short to be a valid transaction message', async () => {
        // A valid Solana message needs at least 69 bytes (3 header + 1 accounts length
        // + 32 account + 32 blockhash + 1 instructions length). Arbitrary short
        // base64 strings like "hello world" (11 bytes) should be rejected.
        const b64 = Buffer.from('hello world').toString('base64');
        const results = await base64TxSearchProvider.search(b64, ctx);
        expect(results).toEqual([]);
    });
});

function extractParams(pathname: string): URLSearchParams {
    return new URLSearchParams(pathname.split('?')[1]);
}

function createMessage(payer: PublicKey) {
    return new TransactionMessage({
        instructions: [
            SystemProgram.transfer({
                fromPubkey: payer,
                lamports: 1_000_000,
                toPubkey: Keypair.generate().publicKey,
            }),
        ],
        payerKey: payer,
        recentBlockhash: PublicKey.default.toBase58(),
    }).compileToLegacyMessage();
}

function createMessageBytes(): Uint8Array {
    return new Uint8Array(createMessage(Keypair.generate().publicKey).serialize());
}

function createBase64Transaction({ sign = false }: { sign?: boolean } = {}): string {
    const kp = Keypair.generate();
    const tx = new VersionedTransaction(createMessage(kp.publicKey));
    if (sign) tx.sign([kp]);
    return Buffer.from(tx.serialize()).toString('base64');
}
