import type { TracesSamplerSamplingContext } from '@sentry/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSentryConfig } from '../config.mjs';
import { clientSentryDsn, serverSentryDsn, traceSampleRateMultiplier, vitalsSampleRateMultiplier } from '../env.mjs';

const samplingContext = (name: string, op?: string): TracesSamplerSamplingContext => ({
    attributes: op ? { 'sentry.op': op } : {},
    inheritOrSampleWith: (fallback: number) => fallback,
    name,
});

const sample = (context: 'client' | 'server' | 'edge', name: string, op?: string): number | boolean => {
    const { tracesSampler } = createSentryConfig(context);
    if (!tracesSampler) {
        throw new Error('tracesSampler is not configured');
    }
    return tracesSampler(samplingContext(name, op));
};

const CLIENT_BASELINE = 1 / 100000000;
const SERVER_BASELINE = 1 / 100000;

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('vitalsSampleRateMultiplier', () => {
    it('should return undefined when the var is unset', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', undefined);
        expect(vitalsSampleRateMultiplier()).toBeUndefined();
    });

    it.each(['0', '-1', 'garbage', 'NaN', 'Infinity', ''])('should return undefined for %j', value => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', value);
        expect(vitalsSampleRateMultiplier()).toBeUndefined();
    });

    it('should parse a rate within (0, 1]', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '0.5');
        expect(vitalsSampleRateMultiplier()).toBe(0.5);
    });

    it('should clamp values above 1', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '5');
        expect(vitalsSampleRateMultiplier()).toBe(1);
    });
});

describe('traceSampleRateMultiplier', () => {
    it('should read the per-runtime var', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_TRACE_SAMPLE_RATE_CLIENT', '0.5');
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_SERVER', '0.25');
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_EDGE', '0');
        expect(traceSampleRateMultiplier('client')).toBe(0.5);
        expect(traceSampleRateMultiplier('server')).toBe(0.25);
        expect(traceSampleRateMultiplier('edge')).toBe(0);
    });

    it('should fall back to the server var for edge', () => {
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_SERVER', '0.25');
        expect(traceSampleRateMultiplier('edge')).toBe(0.25);
    });

    it('should let an explicit edge var override the server fallback', () => {
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_SERVER', '0.25');
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_EDGE', '0');
        expect(traceSampleRateMultiplier('edge')).toBe(0);
    });

    it('should return undefined when unset or unparsable', () => {
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_SERVER', 'garbage');
        expect(traceSampleRateMultiplier('client')).toBeUndefined();
        expect(traceSampleRateMultiplier('server')).toBeUndefined();
    });

    it('should clamp values above 1', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_TRACE_SAMPLE_RATE_CLIENT', '5');
        expect(traceSampleRateMultiplier('client')).toBe(1);
    });
});

describe('DSN helpers', () => {
    it('should expose only the public var to the client', () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@sentry.example/1');
        vi.stubEnv('SENTRY_DSN', 'https://private@sentry.example/2');
        expect(clientSentryDsn()).toBe('https://public@sentry.example/1');
    });

    it('should prefer the private var on the server', () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@sentry.example/1');
        vi.stubEnv('SENTRY_DSN', 'https://private@sentry.example/2');
        expect(serverSentryDsn()).toBe('https://private@sentry.example/2');
    });

    it('should fall back to the public var on the server', () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@sentry.example/1');
        vi.stubEnv('SENTRY_DSN', undefined);
        expect(serverSentryDsn()).toBe('https://public@sentry.example/1');
    });

    it('should leave the client without a DSN when only the private var is set', () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined);
        vi.stubEnv('SENTRY_DSN', 'https://private@sentry.example/2');
        expect(clientSentryDsn()).toBeUndefined();
        expect(serverSentryDsn()).toBe('https://private@sentry.example/2');
    });
});

describe('createSentryConfig dsn', () => {
    it('should wire the public DSN for the client and the private one for server/edge', () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@sentry.example/1');
        vi.stubEnv('SENTRY_DSN', 'https://private@sentry.example/2');
        expect(createSentryConfig('client').dsn).toBe('https://public@sentry.example/1');
        expect(createSentryConfig('server').dsn).toBe('https://private@sentry.example/2');
        expect(createSentryConfig('edge').dsn).toBe('https://private@sentry.example/2');
    });

    it('should keep server/edge reporting when the public var is absent', () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined);
        vi.stubEnv('SENTRY_DSN', 'https://private@sentry.example/2');
        expect(createSentryConfig('client').dsn).toBeUndefined();
        expect(createSentryConfig('server').dsn).toBe('https://private@sentry.example/2');
        expect(createSentryConfig('edge').dsn).toBe('https://private@sentry.example/2');
    });
});

describe('createSentryConfig environment', () => {
    it('should report the Vercel environment on every runtime', () => {
        vi.stubEnv('VERCEL_ENV', 'preview');
        vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
        expect(createSentryConfig('client').environment).toBe('preview');
        expect(createSentryConfig('server').environment).toBe('preview');
        expect(createSentryConfig('edge').environment).toBe('preview');
    });

    it('should fall back to NODE_ENV outside Vercel', () => {
        vi.stubEnv('VERCEL_ENV', undefined);
        vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
        vi.stubEnv('NODE_ENV', 'development');
        expect(createSentryConfig('client').environment).toBe('development');
        expect(createSentryConfig('server').environment).toBe('development');
        expect(createSentryConfig('edge').environment).toBe('development');
    });
});

describe('sampleRate', () => {
    it('should keep error events at full sample on every runtime', () => {
        expect(createSentryConfig('client').sampleRate).toBe(1);
        expect(createSentryConfig('server').sampleRate).toBe(1);
        expect(createSentryConfig('edge').sampleRate).toBe(1);
    });
});

describe('tracesSampler vitals gate', () => {
    it.each(['pageload', 'navigation'])('should scale the vitals rate for client %s', op => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '1');
        expect(sample('client', '/address/abc', op)).toBe(0.001);
    });

    it('should apply a fractional multiplier', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '0.5');
        expect(sample('client', '/address/abc', 'pageload')).toBe(0.0005);
    });

    it('should keep the baseline for other client ops', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '1');
        expect(sample('client', 'GET /api/foo', 'http.client')).toBe(CLIENT_BASELINE);
    });

    it('should keep the baseline for server and edge regardless of op', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '1');
        expect(sample('server', '/address/abc', 'pageload')).toBe(SERVER_BASELINE);
        expect(sample('edge', '/address/abc', 'pageload')).toBe(CLIENT_BASELINE);
    });

    it('should fall back to the baseline when the var is unset', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', undefined);
        expect(sample('client', '/address/abc', 'pageload')).toBe(CLIENT_BASELINE);
    });

    it.each(['0', 'garbage', '-0.5'])('should fall back to the baseline for %j', value => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', value);
        expect(sample('client', '/address/abc', 'pageload')).toBe(CLIENT_BASELINE);
    });

    it('should dampen the baseline with the per-runtime multiplier', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_TRACE_SAMPLE_RATE_CLIENT', '0.5');
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_SERVER', '0');
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_EDGE', '1');
        expect(sample('client', '/address/abc', 'http.client')).toBe(CLIENT_BASELINE * 0.5);
        expect(sample('server', 'GET /address/abc')).toBe(0);
        expect(sample('edge', 'GET /address/abc')).toBe(CLIENT_BASELINE);
    });

    it('should mute edge through the server fallback', () => {
        vi.stubEnv('TELEMETRY_TRACE_SAMPLE_RATE_SERVER', '0');
        expect(sample('edge', 'GET /address/abc')).toBe(0);
    });

    it('should keep the vitals gate ahead of the baseline multiplier', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '1');
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_TRACE_SAMPLE_RATE_CLIENT', '0');
        expect(sample('client', '/address/abc', 'pageload')).toBe(0.001);
    });

    it('should keep the zero branches ahead of the vitals gate', () => {
        vi.stubEnv('NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE', '1');
        expect(sample('client', '/.well-known/foo', 'pageload')).toBe(0);
        expect(sample('client', 'GET https://iad1.suspense-cache.vercel-infra.com/v1/x', 'pageload')).toBe(0);
    });
});
