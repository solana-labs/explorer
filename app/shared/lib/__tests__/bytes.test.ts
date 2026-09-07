import BN from 'bn.js';
import { describe, expect, it } from 'vitest';

import {
    alloc,
    bnToBytes,
    bytes,
    bytesToBn,
    concat,
    concatBytes,
    equals,
    fromBase64,
    fromBase64Url,
    fromHex,
    fromUtf8,
    isByteArray,
    isValidBase64,
    readU8,
    readU64LE,
    readUint8,
    readUint16LE,
    readUint32LE,
    startsWith,
    toBase64,
    toBase64Url,
    toBuffer,
    toHex,
    toLeBytes,
    toUint8Array,
    toUtf8,
    writeU64LE,
    writeUint32LE,
} from '../bytes';

// Note: Buffer is used in tests for decoding since tests run in Node.js environment.
// The production code uses only Uint8Array for browser compatibility.

// Shared test data for base64 encoding/decoding
/* eslint-disable sort-keys-fix/sort-keys-fix */
const base64TestCases: Record<string, number[]> = {
    'SGVsbG8=': [72, 101, 108, 108, 111], // "Hello"
    'SGVsbG8gV29ybGQ=': [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100], // "Hello World"
    'dGVzdA==': [116, 101, 115, 116], // "test"
    '': [], // empty
};
/* eslint-enable sort-keys-fix/sort-keys-fix */

// Invalid base64 strings for isValidBase64 tests
const invalidBase64Strings = ['Hello World!', 'Invalid@#$', 'not-valid-base64!!!'];

// All 256 byte values for binary data tests
const allByteValues = Array.from({ length: 256 }, (_, i) => i);
const allByteValuesBase64 = btoa(String.fromCharCode(...new Uint8Array(allByteValues)));

// Shared test data for hex encoding/decoding
const hexTestCases: Record<string, number[]> = {
    '': [],
    '00': [0],
    '010203': [1, 2, 3],
    '10': [16],
    '1d9acb512ea545e4': [0x1d, 0x9a, 0xcb, 0x51, 0x2e, 0xa5, 0x45, 0xe4],
    deadbeef: [0xde, 0xad, 0xbe, 0xef],
    ff: [255],
    ff007f80: [0xff, 0x00, 0x7f, 0x80],
};

// All 256 byte values as hex string
const allByteValuesHex = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0')).join('');

// Shared test data for UTF-8 encoding/decoding
const utf8TestCases: Record<string, number[]> = {
    '': [],
    Hello: [72, 101, 108, 108, 111],
    'Hello World': [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100],
    世界: [228, 184, 150, 231, 149, 140], // Chinese characters
    '🚀': [240, 159, 154, 128], // Emoji (4-byte UTF-8)
};

// Test values for writeUint32LE (value -> expected LE bytes)
const writeUint32LETestCases: Record<number, number[]> = {
    0: [0, 0, 0, 0],
    1: [1, 0, 0, 0],
    255: [255, 0, 0, 0],
    256: [0, 1, 0, 0],
    300000: [224, 147, 4, 0],
    0xffffffff: [255, 255, 255, 255],
    65535: [255, 255, 0, 0],
};

describe('bytes helpers', () => {
    describe('Base64', () => {
        describe('fromBase64', () => {
            it.each(Object.entries(base64TestCases))('should decode "%s"', (base64, expected) => {
                const result = fromBase64(base64);
                expect(Array.from(result)).toEqual(expected);
            });

            it('should match Buffer.from behavior', () => {
                for (const [base64, expected] of Object.entries(base64TestCases)) {
                    const result = fromBase64(base64);
                    const bufferResult = Buffer.from(base64, 'base64');
                    expect(Array.from(result)).toEqual(expected);
                    expect(Array.from(result)).toEqual(Array.from(bufferResult));
                }
            });

            describe('fallback using atob', () => {
                // @ts-expect-error Intentionally accessing non-standard property for testing
                const originalFromBase64 = Uint8Array['fromBase64'];

                beforeEach(() => {
                    // @ts-expect-error Intentionally deleting to force fallback path
                    delete Uint8Array['fromBase64'];
                });

                afterEach(() => {
                    if (originalFromBase64) {
                        // @ts-expect-error Intentionally restoring non-standard property
                        Uint8Array['fromBase64'] = originalFromBase64;
                    }
                });

                it.each(Object.entries(base64TestCases))('should decode "%s" using atob', (base64, expected) => {
                    const result = fromBase64(base64);
                    const bufferResult = Buffer.from(base64, 'base64');
                    expect(Array.from(result)).toEqual(expected);
                    expect(Array.from(result)).toEqual(Array.from(bufferResult));
                });

                it('should handle binary data with all byte values', () => {
                    const decoded = fromBase64(allByteValuesBase64);
                    expect(Array.from(decoded)).toEqual(allByteValues);
                });
            });

            describe('native Uint8Array.fromBase64', () => {
                const hasNative = 'fromBase64' in Uint8Array;

                it.runIf(hasNative).each(Object.entries(base64TestCases))(
                    'should decode "%s" using native',
                    (base64, expected) => {
                        const result = fromBase64(base64);
                        const bufferResult = Buffer.from(base64, 'base64');
                        expect(Array.from(result)).toEqual(expected);
                        expect(Array.from(result)).toEqual(Array.from(bufferResult));
                    },
                );

                it.runIf(hasNative)('should handle binary data with all byte values', () => {
                    const decoded = fromBase64(allByteValuesBase64);
                    expect(Array.from(decoded)).toEqual(allByteValues);
                });
            });

            it('should decode unpadded base64 when the runtime allows it', () => {
                // Node's atob accepts unpadded base64; callers that need strict
                // padding validation should normalise before calling fromBase64.
                expect(fromBase64('SGVsbG8')).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
            });

            it('should throw on invalid base64 string', () => {
                expect(() => fromBase64('Hello World!')).toThrow();
                expect(() => fromBase64('Invalid@#$')).toThrow();
                expect(() => fromBase64('not-valid-base64!!!')).toThrow();
            });
        });

        describe('toBase64', () => {
            it.each(Object.entries(base64TestCases))('should encode to "%s"', (expected, input) => {
                const result = toBase64(new Uint8Array(input));
                expect(result).toBe(expected);
            });

            it('should match Buffer.toString behavior', () => {
                for (const [expected, input] of Object.entries(base64TestCases)) {
                    const result = toBase64(new Uint8Array(input));
                    const bufferResult = Buffer.from(input).toString('base64');
                    expect(result).toBe(expected);
                    expect(result).toBe(bufferResult);
                }
            });

            it('should handle binary data with all byte values', () => {
                const input = new Uint8Array(allByteValues);
                const base64 = toBase64(input);
                expect(base64).toBe(allByteValuesBase64);
            });

            it('should handle padding correctly', () => {
                expect(toBase64(new Uint8Array([1]))).toBe('AQ==');
                expect(toBase64(new Uint8Array([1, 2]))).toBe('AQI=');
                expect(toBase64(new Uint8Array([1, 2, 3]))).toBe('AQID');
            });

            describe('fallback using btoa', () => {
                // @ts-expect-error Intentionally accessing non-standard property for testing
                const originalToBase64 = Uint8Array.prototype['toBase64'];

                beforeEach(() => {
                    // @ts-expect-error Intentionally deleting to force fallback path
                    delete Uint8Array.prototype['toBase64'];
                });

                afterEach(() => {
                    if (originalToBase64) {
                        // @ts-expect-error Intentionally restoring non-standard property
                        Uint8Array.prototype['toBase64'] = originalToBase64;
                    }
                });

                it.each(Object.entries(base64TestCases))('should encode to "%s" using btoa', (expected, input) => {
                    const result = toBase64(new Uint8Array(input));
                    const bufferResult = Buffer.from(input).toString('base64');
                    expect(result).toBe(expected);
                    expect(result).toBe(bufferResult);
                });

                it('should handle binary data with all byte values', () => {
                    const input = new Uint8Array(allByteValues);
                    const base64 = toBase64(input);
                    const decoded = fromBase64(base64);
                    expect(Array.from(decoded)).toEqual(allByteValues);
                });

                it('should handle large input without stack overflow', () => {
                    const input = new Uint8Array(100_000);
                    input.forEach((_, i) => {
                        input[i] = i % 256;
                    });
                    const base64 = toBase64(input);
                    const decoded = fromBase64(base64);
                    expect(decoded.length).toBe(100_000);
                    expect(decoded[0]).toBe(0);
                    expect(decoded[255]).toBe(255);
                    expect(decoded[256]).toBe(0);
                });
            });

            describe('native Uint8Array.prototype.toBase64', () => {
                const hasNative = 'toBase64' in Uint8Array.prototype;

                it.runIf(hasNative).each(Object.entries(base64TestCases))(
                    'should encode to "%s" using native',
                    (expected, input) => {
                        const result = toBase64(new Uint8Array(input));
                        const bufferResult = Buffer.from(input).toString('base64');
                        expect(result).toBe(expected);
                        expect(result).toBe(bufferResult);
                    },
                );

                it.runIf(hasNative)('should handle binary data with all byte values', () => {
                    const input = new Uint8Array(allByteValues);
                    const base64 = toBase64(input);
                    expect(base64).toBe(allByteValuesBase64);
                });
            });
        });

        describe('base64url', () => {
            it('should encode without URL-escaped characters or padding', () => {
                const input = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);

                expect(toBase64Url(input)).toBe('__79_A');
                expect(fromBase64Url('__79_A')).toEqual(input);
            });

            it('should decode existing standard base64 links', () => {
                expect(fromBase64Url('//79/A==')).toEqual(new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]));
            });

            it("should keep a maximum one-signature v1 message query below Vercel's URL limit", () => {
                const message = new Uint8Array(4096 - 64).fill(0xff);
                const query = new URLSearchParams({ message: toBase64Url(message) }).toString();

                expect(query.length).toBeLessThan(14 * 1024);
                expect(query).not.toContain('%');
            });

            it('should reject an impossible encoded length', () => {
                expect(() => fromBase64Url('a')).toThrow('Invalid base64url string');
            });
        });

        describe('isValidBase64', () => {
            it.each(Object.keys(base64TestCases).filter(k => k !== ''))('should return true for "%s"', str => {
                expect(isValidBase64(str)).toBe(true);
            });

            it('should return false for empty string', () => {
                expect(isValidBase64('')).toBe(false);
            });

            it.each(invalidBase64Strings)('should return false for "%s"', str => {
                expect(isValidBase64(str)).toBe(false);
            });

            it('should return false for non-strings', () => {
                expect(isValidBase64(null as unknown as string)).toBe(false);
                expect(isValidBase64(undefined as unknown as string)).toBe(false);
                expect(isValidBase64(123 as unknown as string)).toBe(false);
            });
        });
    });

    describe('Hex', () => {
        describe('fromHex', () => {
            it.each(Object.entries(hexTestCases))('should decode "%s"', (hex, expected) => {
                const result = fromHex(hex);
                expect(Array.from(result)).toEqual(expected);
            });

            it.each(Object.entries(hexTestCases))(
                'should decode "0x%s" with prefix to same result',
                (hex, expected) => {
                    const withoutPrefix = fromHex(hex);
                    const withPrefix = fromHex(`0x${hex}`);
                    expect(Array.from(withoutPrefix)).toEqual(expected);
                    expect(Array.from(withPrefix)).toEqual(expected);
                    expect(Array.from(withPrefix)).toEqual(Array.from(withoutPrefix));
                },
            );

            it('should match Buffer.from behavior', () => {
                for (const [hex, expected] of Object.entries(hexTestCases)) {
                    const result = fromHex(hex);
                    const bufferResult = Buffer.from(hex, 'hex');
                    expect(Array.from(result)).toEqual(expected);
                    expect(Array.from(result)).toEqual(Array.from(bufferResult));
                }
            });

            it('should normalise odd-length hex by zero-padding', () => {
                expect(Array.from(fromHex('abc'))).toEqual([0x0a, 0xbc]);
                expect(Array.from(fromHex('f'))).toEqual([0x0f]);
                expect(Array.from(fromHex('0x1'))).toEqual([0x01]);
            });

            it('should throw on invalid hex characters', () => {
                expect(() => fromHex('zzzz')).toThrow();
                expect(() => fromHex('0xgg')).toThrow();
            });

            describe('fallback', () => {
                // @ts-expect-error Intentionally accessing non-standard property for testing
                const originalFromHex = Uint8Array['fromHex'];

                beforeEach(() => {
                    // @ts-expect-error Intentionally deleting to force fallback path
                    delete Uint8Array['fromHex'];
                });

                afterEach(() => {
                    if (originalFromHex) {
                        // @ts-expect-error Intentionally restoring non-standard property
                        Uint8Array['fromHex'] = originalFromHex;
                    }
                });

                it.each(Object.entries(hexTestCases))('should decode "%s" using fallback', (hex, expected) => {
                    const result = fromHex(hex);
                    expect(Array.from(result)).toEqual(expected);
                });

                it('should handle binary data with all byte values', () => {
                    const decoded = fromHex(allByteValuesHex);
                    expect(Array.from(decoded)).toEqual(allByteValues);
                });

                it('should throw with position info on invalid hex', () => {
                    expect(() => fromHex('zzzz')).toThrow('Invalid hex character at position 0: "zz"');
                    expect(() => fromHex('deadzz')).toThrow('Invalid hex character at position 4: "zz"');
                });
            });

            describe('native Uint8Array.fromHex', () => {
                const hasNative = 'fromHex' in Uint8Array;

                it.runIf(hasNative).each(Object.entries(hexTestCases))(
                    'should decode "%s" using native',
                    (hex, expected) => {
                        const result = fromHex(hex);
                        expect(Array.from(result)).toEqual(expected);
                    },
                );

                it.runIf(hasNative)('should handle binary data with all byte values', () => {
                    const decoded = fromHex(allByteValuesHex);
                    expect(Array.from(decoded)).toEqual(allByteValues);
                });
            });
        });

        describe('toHex', () => {
            it.each(Object.entries(hexTestCases))('should encode to "%s"', (expected, input) => {
                const result = toHex(new Uint8Array(input));
                expect(result).toBe(expected);
            });

            it('should match Buffer.toString behavior', () => {
                for (const [expected, input] of Object.entries(hexTestCases)) {
                    const result = toHex(new Uint8Array(input));
                    const bufferResult = Buffer.from(input).toString('hex');
                    expect(result).toBe(expected);
                    expect(result).toBe(bufferResult);
                }
            });

            it('should handle binary data with all byte values', () => {
                const input = new Uint8Array(allByteValues);
                const hex = toHex(input);
                expect(hex).toBe(allByteValuesHex);
            });

            describe('fallback', () => {
                // @ts-expect-error Intentionally accessing non-standard property for testing
                const originalToHex = Uint8Array.prototype['toHex'];

                beforeEach(() => {
                    // @ts-expect-error Intentionally deleting to force fallback path
                    delete Uint8Array.prototype['toHex'];
                });

                afterEach(() => {
                    if (originalToHex) {
                        // @ts-expect-error Intentionally restoring non-standard property
                        Uint8Array.prototype['toHex'] = originalToHex;
                    }
                });

                it.each(Object.entries(hexTestCases))('should encode to "%s" using fallback', (expected, input) => {
                    const result = toHex(new Uint8Array(input));
                    expect(result).toBe(expected);
                });

                it('should handle binary data with all byte values', () => {
                    const input = new Uint8Array(allByteValues);
                    const hex = toHex(input);
                    const decoded = fromHex(hex);
                    expect(Array.from(decoded)).toEqual(allByteValues);
                });
            });

            describe('native Uint8Array.prototype.toHex', () => {
                const hasNative = 'toHex' in Uint8Array.prototype;

                it.runIf(hasNative).each(Object.entries(hexTestCases))(
                    'should encode to "%s" using native',
                    (expected, input) => {
                        const result = toHex(new Uint8Array(input));
                        expect(result).toBe(expected);
                    },
                );

                it.runIf(hasNative)('should handle binary data with all byte values', () => {
                    const input = new Uint8Array(allByteValues);
                    const hex = toHex(input);
                    expect(hex).toBe(allByteValuesHex);
                });
            });
        });
    });

    describe('UTF-8', () => {
        describe('fromUtf8', () => {
            it.each(Object.entries(utf8TestCases))('should encode "%s"', (str, expected) => {
                const result = fromUtf8(str);
                expect(Array.from(result)).toEqual(expected);
            });

            it('should match Buffer.from behavior', () => {
                for (const [str, expected] of Object.entries(utf8TestCases)) {
                    const result = fromUtf8(str);
                    const bufferResult = Buffer.from(str, 'utf-8');
                    expect(Array.from(result)).toEqual(expected);
                    expect(Array.from(result)).toEqual(Array.from(bufferResult));
                }
            });
        });

        describe('toUtf8', () => {
            it.each(Object.entries(utf8TestCases))('should decode to "%s"', (expected, input) => {
                const result = toUtf8(new Uint8Array(input));
                expect(result).toBe(expected);
            });

            it('should match Buffer.toString behavior', () => {
                for (const [expected, input] of Object.entries(utf8TestCases)) {
                    const result = toUtf8(new Uint8Array(input));
                    const bufferResult = Buffer.from(input).toString('utf-8');
                    expect(result).toBe(expected);
                    expect(result).toBe(bufferResult);
                }
            });

            it('should roundtrip with fromUtf8', () => {
                for (const str of Object.keys(utf8TestCases)) {
                    const encoded = fromUtf8(str);
                    const decoded = toUtf8(encoded);
                    expect(decoded).toBe(str);
                }
            });
        });
    });

    describe('alloc', () => {
        it('should create zero-filled array', () => {
            const result = alloc(5);
            expect(Array.from(result)).toEqual([0, 0, 0, 0, 0]);
        });

        it('should create empty array for size 0', () => {
            const result = alloc(0);
            expect(result.length).toBe(0);
        });

        it('should match Buffer.alloc behavior', () => {
            const sizes = [0, 1, 5, 100];
            for (const size of sizes) {
                const bufferResult = Buffer.alloc(size);
                const helperResult = alloc(size);
                expect(Array.from(helperResult)).toEqual(Array.from(bufferResult));
            }
        });
    });

    describe('writeUint32LE', () => {
        it.each(Object.entries(writeUint32LETestCases))('should write %d as little-endian bytes', (value, expected) => {
            const data = alloc(4);
            writeUint32LE(data, Number(value), 0);
            expect(Array.from(data)).toEqual(expected);
        });

        it.each(Object.entries(writeUint32LETestCases))(
            'should match Buffer.writeUInt32LE for value %d',
            (value, expected) => {
                const data = alloc(4);
                writeUint32LE(data, Number(value), 0);
                const bufferResult = Buffer.alloc(4);
                bufferResult.writeUInt32LE(Number(value), 0);
                expect(Array.from(data)).toEqual(expected);
                expect(Array.from(data)).toEqual(Array.from(bufferResult));
            },
        );

        it('should write at specified offset', () => {
            const data = alloc(6);
            data[0] = 0xff;
            data[5] = 0xee;
            writeUint32LE(data, 300000, 1);
            expect(Array.from(data)).toEqual([0xff, 224, 147, 4, 0, 0xee]);
        });
    });

    describe('readUint8', () => {
        it('should read a byte at the specified offset', () => {
            const data = new Uint8Array([0x00, 0x7f, 0xff]);

            expect(readUint8(data, 0)).toBe(0x00);
            expect(readUint8(data, 1)).toBe(0x7f);
            expect(readUint8(data, 2)).toBe(0xff);
        });

        it('should return 0 for out-of-bounds reads', () => {
            expect(readUint8(new Uint8Array([1, 2, 3]), 9)).toBe(0);
        });

        it('should match Buffer.readUInt8 behavior for valid offsets', () => {
            const input = [0x12, 0x34, 0xab, 0xcd];
            const data = new Uint8Array(input);
            const buffer = Buffer.from(input);

            for (let offset = 0; offset < input.length; offset++) {
                expect(readUint8(data, offset)).toBe(buffer.readUInt8(offset));
            }
        });
    });

    describe('readUint16LE', () => {
        it('should read little-endian 16-bit values', () => {
            const data = new Uint8Array([0x34, 0x12, 0xcd, 0xab]);

            expect(readUint16LE(data, 0)).toBe(0x1234);
            expect(readUint16LE(data, 2)).toBe(0xabcd);
        });

        it('should read at a non-zero offset', () => {
            const data = new Uint8Array([0xff, 0x78, 0x56, 0xee]);
            expect(readUint16LE(data, 1)).toBe(0x5678);
        });

        it('should match Buffer.readUInt16LE behavior', () => {
            const input = [0x10, 0x32, 0x54, 0x76];
            const data = new Uint8Array(input);
            const buffer = Buffer.from(input);

            expect(readUint16LE(data, 0)).toBe(buffer.readUInt16LE(0));
            expect(readUint16LE(data, 1)).toBe(buffer.readUInt16LE(1));
            expect(readUint16LE(data, 2)).toBe(buffer.readUInt16LE(2));
        });
    });

    describe('readUint32LE', () => {
        it.each(Object.entries(writeUint32LETestCases))('should read %d as little-endian bytes', (value, expected) => {
            expect(readUint32LE(new Uint8Array(expected), 0)).toBe(Number(value) >>> 0);
        });

        it('should read at the specified offset', () => {
            const data = new Uint8Array([0xff, 224, 147, 4, 0, 0xee]);
            expect(readUint32LE(data, 1)).toBe(300000);
        });

        it('should match Buffer.readUInt32LE behavior', () => {
            const input = [0xaa, 0x78, 0x56, 0x34, 0x12, 0xbb];
            const data = new Uint8Array(input);
            const buffer = Buffer.from(input);

            expect(readUint32LE(data, 0)).toBe(buffer.readUInt32LE(0));
            expect(readUint32LE(data, 1)).toBe(buffer.readUInt32LE(1));
            expect(readUint32LE(data, 2)).toBe(buffer.readUInt32LE(2));
        });
    });

    describe('concat', () => {
        it('should concatenate arrays', () => {
            const a = new Uint8Array([1, 2]);
            const b = new Uint8Array([3, 4]);
            const result = concat([a, b]);
            expect(Array.from(result)).toEqual([1, 2, 3, 4]);
        });

        it('should handle empty arrays', () => {
            const result = concat([]);
            expect(result.length).toBe(0);
        });

        it('should handle single array', () => {
            const a = new Uint8Array([1, 2, 3]);
            const result = concat([a]);
            expect(Array.from(result)).toEqual([1, 2, 3]);
        });

        it('should handle arrays with empty elements', () => {
            const a = new Uint8Array([1, 2]);
            const b = new Uint8Array([]);
            const c = new Uint8Array([3]);
            const result = concat([a, b, c]);
            expect(Array.from(result)).toEqual([1, 2, 3]);
        });

        it('should match Buffer.concat behavior', () => {
            const a = new Uint8Array([1, 2]);
            const b = new Uint8Array([3, 4]);
            const bufferResult = Buffer.concat([Buffer.from(a), Buffer.from(b)]);
            const helperResult = concat([a, b]);
            expect(Array.from(helperResult)).toEqual(Array.from(bufferResult));
        });
    });

    describe('equals', () => {
        it('should return true for equal arrays', () => {
            const a = new Uint8Array([1, 2, 3]);
            const b = new Uint8Array([1, 2, 3]);
            expect(equals(a, b)).toBe(true);
        });

        it('should return false for different arrays', () => {
            const a = new Uint8Array([1, 2, 3]);
            const b = new Uint8Array([1, 2, 4]);
            expect(equals(a, b)).toBe(false);
        });

        it('should return false for different lengths', () => {
            const a = new Uint8Array([1, 2, 3]);
            const b = new Uint8Array([1, 2]);
            expect(equals(a, b)).toBe(false);
        });

        it('should return true for same reference', () => {
            const a = new Uint8Array([1, 2, 3]);
            expect(equals(a, a)).toBe(true);
        });

        it('should return true for empty arrays', () => {
            const a = new Uint8Array([]);
            const b = new Uint8Array([]);
            expect(equals(a, b)).toBe(true);
        });

        it('should match Buffer.equals behavior', () => {
            const testCases = [
                [
                    [1, 2, 3],
                    [1, 2, 3],
                ],
                [
                    [1, 2, 3],
                    [1, 2, 4],
                ],
                [
                    [1, 2],
                    [1, 2, 3],
                ],
                [[], []],
            ] as const;

            for (const [aArr, bArr] of testCases) {
                const bufA = Buffer.from(aArr);
                const bufB = Buffer.from(bArr);
                const uint8A = new Uint8Array(aArr);
                const uint8B = new Uint8Array(bArr);
                expect(equals(uint8A, uint8B)).toBe(bufA.equals(bufB));
            }
        });
    });

    describe('bnToBytes', () => {
        it('should convert BN to little-endian bytes', () => {
            const bn = new BN(256);
            const result = bnToBytes(bn, 'le', 2);
            expect(Array.from(result)).toEqual([0, 1]);
        });

        it('should convert BN to big-endian bytes', () => {
            const bn = new BN(256);
            const result = bnToBytes(bn, 'be', 2);
            expect(Array.from(result)).toEqual([1, 0]);
        });

        it('should pad to specified size', () => {
            const bn = new BN(1);
            const result = bnToBytes(bn, 'le', 8);
            expect(Array.from(result)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
        });

        it('should handle max u64', () => {
            const bn = new BN('18446744073709551615');
            const result = bnToBytes(bn, 'le', 8);
            expect(Array.from(result)).toEqual([255, 255, 255, 255, 255, 255, 255, 255]);
        });

        it('should match bn.toArrayLike(Buffer) behavior', () => {
            const testCases = [
                { endian: 'le' as const, size: 2, value: '256' },
                { endian: 'be' as const, size: 2, value: '256' },
                { endian: 'le' as const, size: 8, value: '1' },
                { endian: 'le' as const, size: 4, value: '16777216' },
            ];

            for (const { value, endian, size } of testCases) {
                const bn = new BN(value);
                const bufferResult = bn.toArrayLike(Buffer, endian, size);
                const helperResult = bnToBytes(bn, endian, size);
                expect(Array.from(helperResult)).toEqual(Array.from(bufferResult));
            }
        });
    });

    describe('bytesToBn', () => {
        it('should convert little-endian bytes to BN', () => {
            const bytes = new Uint8Array([0, 1]); // 256 in LE
            const result = bytesToBn(BN, bytes, 'le');
            expect(result.toNumber()).toBe(256);
        });

        it('should convert big-endian bytes to BN', () => {
            const bytes = new Uint8Array([1, 0]); // 256 in BE
            const result = bytesToBn(BN, bytes, 'be');
            expect(result.toNumber()).toBe(256);
        });
    });

    describe('isByteArray', () => {
        it('should return true for Uint8Array', () => {
            expect(isByteArray(new Uint8Array([1, 2, 3]))).toBe(true);
        });

        it('should return true for Buffer', () => {
            expect(isByteArray(Buffer.from([1, 2, 3]))).toBe(true);
        });

        it('should return false for other types', () => {
            expect(isByteArray([1, 2, 3])).toBe(false);
            expect(isByteArray('hello')).toBe(false);
            expect(isByteArray(null)).toBe(false);
            expect(isByteArray(undefined)).toBe(false);
        });
    });

    describe('toUint8Array', () => {
        it('should return same array for pure Uint8Array', () => {
            const arr = new Uint8Array([1, 2, 3]);
            const result = toUint8Array(arr);
            expect(result).toBe(arr); // Same reference
        });

        it('should convert Buffer to Uint8Array', () => {
            const buf = Buffer.from([1, 2, 3]);
            const result = toUint8Array(buf);
            expect(result.constructor).toBe(Uint8Array);
            expect(Array.from(result)).toEqual([1, 2, 3]);
        });
    });

    describe('bytes()', () => {
        describe('string input', () => {
            it('should encode string as UTF-8 by default', () => {
                const result = bytes('hello');
                expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
                // Verify it matches Buffer.from behavior
                expect(Array.from(result)).toEqual(Array.from(Buffer.from('hello')));
            });

            it('should encode string as UTF-8 with explicit encoding', () => {
                const result = bytes('hello', 'utf8');
                expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
            });

            it('should decode hex string', () => {
                const result = bytes('deadbeef', 'hex');
                expect(Array.from(result)).toEqual([0xde, 0xad, 0xbe, 0xef]);
                // Verify it matches Buffer.from behavior
                expect(Array.from(result)).toEqual(Array.from(Buffer.from('deadbeef', 'hex')));
            });

            it('should decode base64 string', () => {
                const result = bytes('SGVsbG8=', 'base64');
                expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]); // "Hello"
                // Verify it matches Buffer.from behavior
                expect(Array.from(result)).toEqual(Array.from(Buffer.from('SGVsbG8=', 'base64')));
            });

            it('should handle unicode strings', () => {
                const result = bytes('Hello 世界');
                expect(Array.from(result)).toEqual(Array.from(Buffer.from('Hello 世界')));
            });

            it('should handle empty string', () => {
                const result = bytes('');
                expect(result.length).toBe(0);
            });
        });

        describe('array input', () => {
            it('should create from number array', () => {
                const result = bytes([1, 2, 3, 255]);
                expect(Array.from(result)).toEqual([1, 2, 3, 255]);
                // Verify it matches Buffer.from behavior
                expect(Array.from(result)).toEqual(Array.from(Buffer.from([1, 2, 3, 255])));
            });

            it('should handle empty array', () => {
                const result = bytes([]);
                expect(result.length).toBe(0);
            });
        });

        describe('Uint8Array input', () => {
            it('should create a copy of Uint8Array', () => {
                const original = new Uint8Array([1, 2, 3]);
                const result = bytes(original);
                expect(Array.from(result)).toEqual([1, 2, 3]);
                // Should be a copy, not the same reference
                expect(result).not.toBe(original);
            });
        });

        describe('ArrayBuffer input', () => {
            it('should create from ArrayBuffer', () => {
                const buffer = new ArrayBuffer(4);
                const view = new Uint8Array(buffer);
                view.set([10, 20, 30, 40]);

                const result = bytes(buffer);
                expect(Array.from(result)).toEqual([10, 20, 30, 40]);
            });
        });

        describe('Buffer.from parity', () => {
            it('should match Buffer.from for all common cases', () => {
                // String without encoding
                expect(Array.from(bytes('test'))).toEqual(Array.from(Buffer.from('test')));

                // String with utf8
                expect(Array.from(bytes('test', 'utf8'))).toEqual(Array.from(Buffer.from('test', 'utf8')));

                // Hex
                expect(Array.from(bytes('0102ff', 'hex'))).toEqual(Array.from(Buffer.from('0102ff', 'hex')));

                // Base64
                expect(Array.from(bytes('dGVzdA==', 'base64'))).toEqual(Array.from(Buffer.from('dGVzdA==', 'base64')));

                // Array
                expect(Array.from(bytes([0, 127, 255]))).toEqual(Array.from(Buffer.from([0, 127, 255])));
            });
        });
    });
});

describe('concatBytes', () => {
    it('should return empty array for no arguments', () => {
        expect(concatBytes()).toEqual(new Uint8Array([]));
    });

    it('should return a copy of a single array', () => {
        const input = new Uint8Array([1, 2, 3]);
        const result = concatBytes(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });

    it('should concatenate multiple arrays', () => {
        const result = concatBytes(new Uint8Array([1, 2]), new Uint8Array([3]), new Uint8Array([4, 5, 6]));
        expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it('should handle empty arrays in the mix', () => {
        const result = concatBytes(new Uint8Array([]), new Uint8Array([1]), new Uint8Array([]));
        expect(result).toEqual(new Uint8Array([1]));
    });
});

describe('writeU64LE / readU64LE', () => {
    it('should round-trip zero', () => {
        const b = writeU64LE(0n);
        expect(b.length).toBe(8);
        expect(readU64LE(b, 0)).toBe(0n);
    });

    it('should round-trip a small value', () => {
        const value = 42000n;
        expect(readU64LE(writeU64LE(value), 0)).toBe(value);
    });

    it('should round-trip max u64', () => {
        const max = 2n ** 64n - 1n;
        expect(readU64LE(writeU64LE(max), 0)).toBe(max);
    });

    it('should write in little-endian order', () => {
        const b = writeU64LE(1n);
        expect(b[0]).toBe(1);
        expect(b[7]).toBe(0);
    });

    it('should read at an offset', () => {
        const prefix = new Uint8Array([0xff]);
        const data = concatBytes(prefix, writeU64LE(999n));
        expect(readU64LE(data, 1)).toBe(999n);
    });

    it('should throw RangeError when data is too short', () => {
        expect(() => readU64LE(new Uint8Array([1, 2, 3]), 0)).toThrow(RangeError);
    });

    it('should throw RangeError when offset exceeds length', () => {
        expect(() => readU64LE(new Uint8Array(8), 8)).toThrow(RangeError);
    });
});

describe('readU8', () => {
    it('should read a byte at offset', () => {
        expect(readU8(new Uint8Array([10, 20, 30]), 1)).toBe(20);
    });

    it('should throw RangeError when offset is out of bounds', () => {
        expect(() => readU8(new Uint8Array([1]), 1)).toThrow(RangeError);
    });

    it('should throw RangeError for empty array', () => {
        expect(() => readU8(new Uint8Array([]), 0)).toThrow(RangeError);
    });
});

describe('toBuffer', () => {
    it('should convert empty Uint8Array', () => {
        const result = toBuffer(new Uint8Array([]));
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(0);
    });

    it('should preserve bytes', () => {
        const input = new Uint8Array([1, 2, 3, 255]);
        const result = toBuffer(input);
        expect(result).toBeInstanceOf(Buffer);
        expect([...result]).toEqual([1, 2, 3, 255]);
    });

    it('should share the same underlying memory', () => {
        const input = new Uint8Array([10, 20, 30]);
        const result = toBuffer(input);
        input[0] = 99;
        expect(result[0]).toBe(99);
    });

    it('should return the same Buffer when given a Buffer', () => {
        const input = Buffer.from([1, 2, 3]);
        const result = toBuffer(input);
        expect(result).toBe(input);
    });

    it('should handle a Uint8Array view over a larger ArrayBuffer', () => {
        const backing = new ArrayBuffer(16);
        const view = new Uint8Array(backing, 4, 3);
        view.set([0xaa, 0xbb, 0xcc]);
        const result = toBuffer(view);
        expect(result.length).toBe(3);
        expect([...result]).toEqual([0xaa, 0xbb, 0xcc]);
    });
});

describe('toLeBytes', () => {
    const cases: { expected: number[]; size: number; value: number }[] = [
        { expected: [0], size: 1, value: 0 },
        { expected: [255], size: 1, value: 255 },
        { expected: [0, 1], size: 2, value: 256 },
        { expected: [0x34, 0x12], size: 2, value: 0x1234 },
        { expected: [224, 147, 4, 0], size: 4, value: 300000 },
        { expected: [5, 4, 3, 2, 1, 0, 0, 0], size: 8, value: 0x0102030405 },
    ];

    it.each(cases)('should encode $value (size $size) as little-endian', ({ value, size, expected }) => {
        expect(Array.from(toLeBytes(value, size))).toEqual(expected);
    });

    it('should return a Uint8Array of the requested size', () => {
        const result = toLeBytes(1, 4);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(4);
    });

    it('should return an empty array for size 0', () => {
        expect(toLeBytes(123, 0).length).toBe(0);
    });

    it('should drop bytes that overflow the requested size', () => {
        expect(Array.from(toLeBytes(0x1234, 1))).toEqual([0x34]);
        expect(Array.from(toLeBytes(256, 1))).toEqual([0]);
    });

    it('should match bnToBytes little-endian output', () => {
        for (const { value, size } of cases) {
            const expected = bnToBytes(new BN(value), 'le', size);
            expect(Array.from(toLeBytes(value, size))).toEqual(Array.from(expected));
        }
    });
});

describe('startsWith', () => {
    it('should return true when data begins with the prefix', () => {
        expect(startsWith(new Uint8Array([1, 2, 3, 4]), new Uint8Array([1, 2]))).toBe(true);
    });

    it('should return true when the prefix equals the data', () => {
        expect(startsWith(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    });

    it('should return false when a prefix byte differs', () => {
        expect(startsWith(new Uint8Array([1, 2, 3]), new Uint8Array([1, 9]))).toBe(false);
        expect(startsWith(new Uint8Array([9, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(false);
    });

    it('should return false when the prefix is longer than the data', () => {
        expect(startsWith(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
    });

    it('should return true for an empty prefix', () => {
        expect(startsWith(new Uint8Array([1, 2]), new Uint8Array([]))).toBe(true);
        expect(startsWith(new Uint8Array([]), new Uint8Array([]))).toBe(true);
    });

    it('should match a single-byte prefix only at the start', () => {
        expect(startsWith(new Uint8Array([0, 1, 2]), new Uint8Array([0]))).toBe(true);
        expect(startsWith(new Uint8Array([5]), new Uint8Array([0]))).toBe(false);
    });
});
