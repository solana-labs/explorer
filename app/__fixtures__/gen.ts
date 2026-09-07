// Lightweight random data generators for Solana-specific test mocks.
// If generators proliferate, consider replacing with `fast-check` arbitraries
// (e.g. fc.bigInt(), fc.sample()) for composability and shrinking support.

import { getBase58Decoder, getBase58Encoder, type ReadonlyUint8Array } from '@solana/kit';
import type { SecurityTxtFields, SecurityTxtSource } from '@solana/security-txt';
import { PublicKey } from '@solana/web3.js';

const BASE58_ENCODER = getBase58Encoder();
const BASE58_DECODER = getBase58Decoder();

export const gen = {
    /** base58 32-byte address; deterministic when seed provided so story fixtures stay pixel-stable. */
    address: (seed?: number) => {
        const bytes = new Uint8Array(32);
        if (seed === undefined) {
            for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        } else {
            for (let i = 0; i < bytes.length; i++) bytes[i] = (seed * 19 + i * 23 + 5) & 0xff;
            // Without this, `seed` and `seed + 256` collide: every byte above is mod 256, so a
            // caller asking for 257 distinct addresses silently gets 256. Folding the high bits
            // in pushes the repeat out to 65536 and leaves seeds under 256 byte-identical.
            bytes[1] = (bytes[1] + (seed >>> 8)) & 0xff;
        }
        return BASE58_DECODER.decode(bytes);
    },
    bigint: (max = 1_000_000n) => BigInt(Math.floor(Math.random() * Number(max))),
    blockHeight: () => gen.bigint(250_000_000n),
    /** Deterministic blockhash (same seed → same value) so story fixtures stay pixel-stable. */
    blockhash: (seed = 0) => {
        const bytes = new Uint8Array(32);
        for (let i = 0; i < bytes.length; i++) bytes[i] = (seed * 7 + i * 13) & 0xff;
        return BASE58_DECODER.decode(bytes);
    },
    epoch: () => gen.bigint(1_000n),
    /** Same as `address` but returns a `PublicKey` so callers needn't wrap it. */
    publicKey: (seed?: number) => new PublicKey(gen.address(seed)),
    /** Bare resolved security.txt for hook mocks; pass `fields` (e.g. name, version) for the case at hand. */
    securityTxt: (fields: SecurityTxtFields = {}, type: SecurityTxtSource = 'pmp') => ({ fields, type }),
    /** Deterministic when seed provided (same seed → same value) so story fixtures stay pixel-stable. */
    signature: (seed?: number) => {
        const bytes = new Uint8Array(64);
        if (seed === undefined) {
            for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        } else {
            for (let i = 0; i < bytes.length; i++) bytes[i] = (seed * 11 + i * 17) & 0xff;
        }
        return BASE58_DECODER.decode(bytes);
    },
    /** Deterministic when seed provided (same seed → same value) so story fixtures stay pixel-stable. */
    slot: (seed?: number) =>
        seed === undefined ? gen.bigint(300_000_000n) : ((BigInt(seed) + 1n) * 2_654_435_761n) % 300_000_000n,
    /** Unix seconds; deterministic when seed provided so story fixtures stay pixel-stable. */
    timestamp: (seed?: number) =>
        seed === undefined ? Math.floor(Math.random() * 2_000_000_000) : 1_700_000_000 + seed * 86_400,
    /**
     * A readable, self-documenting test address with a recognizable base58 prefix — e.g.
     * `gen.vanityAddress('PMP')` → `PMP1111…` — for fixtures that want a legible placeholder instead of
     * an opaque key. Right-pads the prefix with base58 `1`s until it forms a valid 32-byte address.
     * Throws if `prefix` isn't valid base58 (it excludes `0`, `O`, `I`, `l`) or can't pad to 32 bytes.
     */
    vanityAddress: (prefix: string) => {
        for (let pad = 0; pad <= 44; pad++) {
            const candidate = prefix + '1'.repeat(pad);
            let bytes: ReadonlyUint8Array;
            try {
                bytes = BASE58_ENCODER.encode(candidate);
            } catch {
                break; // a non-base58 character in `prefix` — more padding won't help
            }
            if (bytes.length === 32) return candidate;
        }
        throw new Error(`gen.vanityAddress: "${prefix}" is not a base58 prefix that pads to a 32-byte address`);
    },
};

/** Stable single-placeholder address (base58, 32 bytes). */
export const DEFAULT_ADDRESS = gen.address(0);

/** Stable single-placeholder blockhash. */
export const DEFAULT_BLOCKHASH = gen.blockhash();

/** Stable single-placeholder slot (number). */
export const DEFAULT_SLOT = Number(gen.slot(0));

/** Stable single-placeholder signature (base58, 64 bytes). */
export const DEFAULT_SIGNATURE = gen.signature(0);

/** Stable single-placeholder unix timestamp (seconds since epoch). */
export const DEFAULT_TIMESTAMP = gen.timestamp(0);
