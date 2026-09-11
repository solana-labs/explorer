import '@testing-library/jest-dom';

// ResizeObserver is not available in jsdom
if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

// Needed for @solana/addresses (Solana Kit) which checks isSecureContext before
// using crypto.subtle for PDA derivation. jsdom does not set this to true.
if (!globalThis.isSecureContext) {
    Object.defineProperty(globalThis, 'isSecureContext', { value: true });
}

// jsdom does not implement matchMedia. Provide a default so tests can spy on it
// (Vitest 4's vi.spyOn throws when the target property is undefined). Guarded so
// the real browser implementation is used under the Storybook (browser) project.
if (!globalThis.matchMedia) {
    Object.defineProperty(globalThis, 'matchMedia', {
        configurable: true,
        value(query: string) {
            return {
                addEventListener() {},
                addListener() {},
                dispatchEvent() {
                    return false;
                },
                matches: false,
                media: query,
                removeEventListener() {},
                removeListener() {},
            };
        },
        writable: true,
    });
}

// @solana/keys' signBytes()/verifySignature() pass crypto.subtle the ArrayBuffer that its
// toArrayBuffer() helper returns. jsdom's SubtleCrypto rejects a bare ArrayBuffer — it accepts only
// TypedArray/DataView — so Ed25519 signing and verification throw under the specs (jsdom) project.
// Coerce ArrayBuffer arguments to a Uint8Array view before delegating. A harmless passthrough in
// the Storybook (real browser) project, whose native SubtleCrypto already accepts both. Guarded so
// re-evaluating this setup (Vitest 4 can import it more than once per realm) does not double-wrap.
const subtle = globalThis.crypto?.subtle;
const ARRAYBUFFER_COERCION = Symbol.for('explorer.subtle.arraybuffer-coercion');
if (subtle && !Object.getOwnPropertyDescriptor(subtle, ARRAYBUFFER_COERCION)) {
    const coerce = (data: BufferSource): BufferSource => (data instanceof ArrayBuffer ? new Uint8Array(data) : data);
    const { digest, sign, verify } = subtle;
    subtle.sign = (algorithm, key, data) => sign.call(subtle, algorithm, key, coerce(data));
    subtle.verify = (algorithm, key, signature, data) =>
        verify.call(subtle, algorithm, key, coerce(signature), coerce(data));
    subtle.digest = (algorithm, data) => digest.call(subtle, algorithm, coerce(data));
    Object.defineProperty(subtle, ARRAYBUFFER_COERCION, { value: true });
}

if (!AbortSignal.timeout) {
    AbortSignal.timeout = ms => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    };
}

// Needed for @solana/web3.js to treat Uint8Arrays as Buffers
// See https://github.com/anza-xyz/solana-pay/issues/106
// Guarded + configurable so re-evaluating this setup is idempotent: Vitest 4's browser
// mode can import it more than once in the same realm, and a non-configurable
// redefinition would throw "Cannot redefine property".
if (!Object.getOwnPropertyDescriptor(Uint8Array, Symbol.hasInstance)) {
    const originalHasInstance = Uint8Array[Symbol.hasInstance];
    Object.defineProperty(Uint8Array, Symbol.hasInstance, {
        configurable: true,
        value(potentialInstance: unknown) {
            return originalHasInstance.call(this, potentialInstance) || Buffer.isBuffer(potentialInstance);
        },
    });
}
