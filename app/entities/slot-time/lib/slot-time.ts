import { assert, type Infer, number, refine, type } from 'superstruct';

/** The fields of a `getRecentPerformanceSamples` entry this reads. */
type PerformanceSample = Readonly<{
    numSlots: bigint;
    samplePeriodSecs: number;
}>;

type SlotTimePayload = Infer<typeof SlotTimePayloadStruct>;

/**
 * How many of the most recent samples (one minute each) the feature-gate countdown measures over. Wide
 * enough that one odd minute cannot move it, narrow enough that a slot-time feature gate shows up within
 * minutes of activating.
 */
export const MEASURED_SAMPLES = 5;

export function toSlotTimePayload(samples: readonly PerformanceSample[]): SlotTimePayload {
    return { msPerSlot: toMsPerSlot(samples, MEASURED_SAMPLES) };
}

/**
 * Wall-clock time the cluster spent per slot over the newest `sampleCount` samples, or `undefined` when
 * none of them states a rate.
 *
 * Total time over total slots, not the mean of the per-sample rates. A slow minute produces fewer slots
 * by definition, so weighting every sample alike gives the slow minutes more than their share and the
 * answer only ever runs high.
 *
 * Rounded to whole milliseconds so both fetch paths agree on the figure and the cached body stays stable.
 * At epoch scale that costs well under a minute, against a rate that moves by a hundred milliseconds a
 * slot when a SIMD-0525 gate activates.
 */
export function measureMsPerSlot(samples: readonly PerformanceSample[], sampleCount: number): number | undefined {
    let slots = 0n;
    let seconds = 0;

    for (const sample of samples.slice(0, sampleCount)) {
        // Kit types these without checking them, and a sample that covers no slot cannot state a rate.
        if (typeof sample.numSlots !== 'bigint' || sample.numSlots <= 0n) continue;
        if (typeof sample.samplePeriodSecs !== 'number' || !Number.isFinite(sample.samplePeriodSecs)) continue;
        if (sample.samplePeriodSecs <= 0) continue;

        slots += sample.numSlots;
        seconds += sample.samplePeriodSecs;
    }

    if (slots === 0n) return undefined;

    return Math.round((seconds * 1000) / Number(slots));
}

/** The boundary constructor, for the callers that answer a request: absence becomes an error there. */
export function toMsPerSlot(samples: readonly PerformanceSample[], sampleCount: number): number {
    const msPerSlot = measureMsPerSlot(samples, sampleCount);

    if (msPerSlot === undefined) {
        throw new Error('[slot-time] no sample states a rate');
    }

    return msPerSlot;
}

/** Throws rather than handing back a rate it cannot vouch for, which every countdown would then use. */
export function parseSlotTimePayload(body: unknown): number {
    assert(body, SlotTimePayloadStruct);
    return body.msPerSlot;
}

const SlotTimePayloadStruct = type({
    msPerSlot: refine(number(), 'msPerSlot', value => Number.isFinite(value) && value > 0),
});
