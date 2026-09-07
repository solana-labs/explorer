import { describe, expect, it } from 'vitest';

import { MEASURED_SAMPLES, measureMsPerSlot, parseSlotTimePayload, toMsPerSlot, toSlotTimePayload } from '../slot-time';

/** One minute of slots at a given rate, as `getRecentPerformanceSamples` reports it. */
function sample(msPerSlot: number, samplePeriodSecs = 60) {
    return { numSlots: BigInt(Math.round((samplePeriodSecs * 1000) / msPerSlot)), samplePeriodSecs };
}

describe('measureMsPerSlot', () => {
    it('should measure the rate a single sample states', () => {
        expect(measureMsPerSlot([sample(200)], MEASURED_SAMPLES)).toBe(200);
    });

    // The bug this exists for: the countdown read a 400 ms constant while every cluster had already
    // stepped down through SIMD-0525. Slot counts as the clusters reported them in September 2026.
    it.each([
        ['a cluster before SIMD-0525', 150n, 400],
        ['testnet at the 200 ms gate', 319n, 188],
        ['devnet at the 200 ms gate', 361n, 166],
        ['mainnet at the 300 ms gate', 191n, 314],
    ])('should measure %s', (_name, numSlots, expected) => {
        expect(measureMsPerSlot([{ numSlots, samplePeriodSecs: 60 }], MEASURED_SAMPLES)).toBe(expected);
    });

    // Total time over total slots, not the mean of the per-sample rates: a sample covering a longer
    // period describes more of the epoch and has to weigh more.
    it('should weigh each sample by the time it covers', () => {
        const samples = [sample(200, 30), sample(400, 90)];

        expect(measureMsPerSlot(samples, MEASURED_SAMPLES)).toBe(Math.round(120_000 / (150 + 225)));
    });

    // Mainnet at the 300 ms gate with one degraded minute. Samples of equal length still weigh
    // unequally: the slow minute produced 100 of the 864 slots, so it is 11.57% of the answer and not
    // the 20% an unweighted mean of the five rates would give it (which lands at 371 ms).
    it('should weigh a degraded minute by the slots it produced, not by its share of the samples', () => {
        const samples = [...Array.from({ length: 4 }, () => ({ numSlots: 191n, samplePeriodSecs: 60 })), sample(600)];

        expect(measureMsPerSlot(samples, 5)).toBe(347);
    });

    it('should ignore samples beyond the window it is asked for', () => {
        const samples = [...Array.from({ length: MEASURED_SAMPLES }, () => sample(200)), sample(4000)];

        expect(measureMsPerSlot(samples, MEASURED_SAMPLES)).toBe(200);
    });

    // A sample that covers no slot states no rate, and dividing by it would yield Infinity.
    it('should skip a sample covering no slot', () => {
        expect(measureMsPerSlot([{ numSlots: 0n, samplePeriodSecs: 60 }, sample(200)], MEASURED_SAMPLES)).toBe(200);
    });

    it.each([
        ['a period of zero', { numSlots: 300n, samplePeriodSecs: 0 }],
        ['a negative period', { numSlots: 300n, samplePeriodSecs: -60 }],
        ['a period that is not finite', { numSlots: 300n, samplePeriodSecs: Number.NaN }],
        // Kit types these fields without checking what the node put in them.
        ['a slot count that is not a bigint', { numSlots: 300 as unknown as bigint, samplePeriodSecs: 60 }],
        ['a period that is not a number', { numSlots: 300n, samplePeriodSecs: '60' as unknown as number }],
    ])('should skip a sample with %s', (_reason, broken) => {
        expect(measureMsPerSlot([broken, sample(200)], MEASURED_SAMPLES)).toBe(200);
    });

    it.each([
        ['no samples at all', []],
        ['no sample that states a rate', [{ numSlots: 0n, samplePeriodSecs: 60 }]],
        ['no sample inside the window that states a rate', [{ numSlots: 0n, samplePeriodSecs: 60 }, sample(200)]],
    ])('should state no rate when a node reports %s', (_reason, samples) => {
        expect(measureMsPerSlot(samples, 1)).toBeUndefined();
    });
});

describe('toMsPerSlot', () => {
    it('should carry the measured rate', () => {
        expect(toMsPerSlot([sample(200)], MEASURED_SAMPLES)).toBe(200);
    });

    // Throws rather than returning a fallback: a countdown built on a rate nothing measured is a
    // confidently wrong one.
    it.each([
        ['no samples at all', []],
        ['no sample that states a rate', [{ numSlots: 0n, samplePeriodSecs: 60 }]],
    ])('should throw when a node reports %s', (_reason, samples) => {
        expect(() => toMsPerSlot(samples, MEASURED_SAMPLES)).toThrow('no sample states a rate');
    });
});

describe('toSlotTimePayload', () => {
    it('should carry the measured rate', () => {
        expect(toSlotTimePayload([sample(200)])).toEqual({ msPerSlot: 200 });
    });

    it('should measure over the samples the countdown is meant to see', () => {
        const samples = [...Array.from({ length: MEASURED_SAMPLES }, () => sample(200)), sample(4000)];

        expect(toSlotTimePayload(samples)).toEqual({ msPerSlot: 200 });
    });
});

describe('parseSlotTimePayload', () => {
    it('should read back a rate the route measured', () => {
        expect(parseSlotTimePayload({ msPerSlot: 188 })).toBe(188);
    });

    it.each([
        ['an absent rate', {}],
        ['a rate as a string', { msPerSlot: '200' }],
        ['a rate of zero', { msPerSlot: 0 }],
        ['a negative rate', { msPerSlot: -200 }],
        ['a rate that is not finite', { msPerSlot: Number.POSITIVE_INFINITY }],
        ['no body at all', undefined],
    ])('should throw on %s', (_reason, body) => {
        expect(() => parseSlotTimePayload(body)).toThrow();
    });
});
