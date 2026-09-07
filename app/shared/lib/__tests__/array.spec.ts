import { describe, expect, it } from 'vitest';

import { arrayOrEmpty, chunk } from '../array';

describe('arrayOrEmpty', () => {
    it('should pass an array through', () => {
        const items = [1, 2];
        expect(arrayOrEmpty(items)).toBe(items);
    });

    it('should turn null and undefined into an empty array', () => {
        expect(arrayOrEmpty(null)).toEqual([]);
        expect(arrayOrEmpty(undefined)).toEqual([]);
    });
});

describe('chunk', () => {
    it('should split into runs of at most size', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should return one chunk when the input fits', () => {
        expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });

    it('should split evenly with no trailing empty chunk', () => {
        expect(chunk([1, 2, 3, 4], 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    it('should return nothing for an empty input', () => {
        expect(chunk([], 3)).toEqual([]);
    });

    it('should reject a size that would not terminate', () => {
        expect(() => chunk([1], 0)).toThrow('positive integer');
        expect(() => chunk([1], -1)).toThrow('positive integer');
    });

    // Both slip past a bare `size < 1`: NaN returns [] and drops every item, and a fraction
    // produces a run longer than the size asked for.
    it('should reject a size that is not an integer', () => {
        expect(() => chunk([1, 2, 3], Number.NaN)).toThrow('positive integer');
        expect(() => chunk([1, 2, 3], 1.5)).toThrow('positive integer');
    });
});
