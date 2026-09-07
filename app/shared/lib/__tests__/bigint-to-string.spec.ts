import { describe, expect, it } from 'vitest';

import { withStringsInsteadOfBigInts } from '../bigint-to-string';

describe('withStringsInsteadOfBigInts', () => {
    it('should convert a bare bigint', () => {
        expect(withStringsInsteadOfBigInts(7n)).toBe('7');
    });

    it('should leave other primitives untouched', () => {
        expect(withStringsInsteadOfBigInts('mint')).toBe('mint');
        expect(withStringsInsteadOfBigInts(3)).toBe(3);
        expect(withStringsInsteadOfBigInts(true)).toBe(true);
        expect(withStringsInsteadOfBigInts(null)).toBeNull();
        expect(withStringsInsteadOfBigInts(undefined)).toBeUndefined();
    });

    it('should recurse through nested arrays and plain objects', () => {
        const decoded = { authority: 'abc', supply: 42n, tiers: [{ cap: 5n }] };

        expect(withStringsInsteadOfBigInts(decoded)).toStrictEqual({
            authority: 'abc',
            supply: '42',
            tiers: [{ cap: '5' }],
        });
    });

    it('should preserve every digit of a u64 that a number cast would round', () => {
        const supply = 18446744073709551615n;

        expect(withStringsInsteadOfBigInts({ supply })).toStrictEqual({ supply: '18446744073709551615' });
        expect(Number(supply).toString()).not.toBe('18446744073709551615');
    });

    it('should produce a JSON-serializable payload', () => {
        const converted = withStringsInsteadOfBigInts({ supply: 1n });

        expect(() => JSON.stringify(converted)).not.toThrow();
    });

    it('should pass byte arrays through instead of flattening them', () => {
        const bytes = Uint8Array.from([1, 2]);

        expect(withStringsInsteadOfBigInts(bytes)).toBe(bytes);
    });

    it('should pass class instances and other exotic objects through untouched', () => {
        const map = new Map([['cap', 1n]]);
        const date = new Date(0);

        expect(withStringsInsteadOfBigInts(map)).toBe(map);
        expect(withStringsInsteadOfBigInts(date)).toBe(date);
    });

    it('should not overflow the stack on a circular reference', () => {
        const node: Record<string, unknown> = { supply: 1n };
        node.self = node;

        const converted = withStringsInsteadOfBigInts(node) as Record<string, unknown>;

        expect(converted.supply).toBe('1');
        expect(converted.self).toBe(node);
    });
});
