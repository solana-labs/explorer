import { vitalsSampleRateMultiplier } from './env.mjs';

// Ceiling for vitals sampling; the env multiplier picks the actual rate, so a mis-set var cannot exceed it.
const VITALS_TRACE_SAMPLE_RATE = 0.001;

/**
 * Effective sample rate for client transactions feeding the Web Vitals dashboards.
 * @param {import('@sentry/core').TracesSamplerSamplingContext} samplingContext
 * @returns {number | undefined} undefined when the transaction is not pageload/navigation or vitals sampling is off
 */
export function vitalsTraceSampleRate(samplingContext) {
    const op = samplingContext.attributes?.['sentry.op'];
    if (op !== 'pageload' && op !== 'navigation') {
        return undefined;
    }
    const multiplier = vitalsSampleRateMultiplier();
    if (multiplier === undefined) {
        return undefined;
    }
    return VITALS_TRACE_SAMPLE_RATE * multiplier;
}
