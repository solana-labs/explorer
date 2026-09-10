// Each var is referenced statically: Next.js inlines only literal NEXT_PUBLIC_* expressions.

/**
 * DSN for browser bundles; the client can only ever see the inlined public var.
 * @returns {string | undefined}
 */
export function clientSentryDsn() {
    return process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * DSN for server/edge; the private var wins, the public one covers all runtimes when set alone.
 * @returns {string | undefined}
 */
export function serverSentryDsn() {
    return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Deployment environment; VERCEL_ENV keeps previews out of production stats, NODE_ENV covers local runs.
 * @param {'client' | 'server' | 'edge'} context
 * @returns {string | undefined}
 */
export function sentryEnvironment(context) {
    if (context === 'client') {
        return process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV;
    }
    return process.env.VERCEL_ENV || process.env.NODE_ENV;
}

/**
 * True unless this is a Vercel production deployment or ENABLE_SENTRY_SOURCEMAPS_AT_PREVIEW opts a preview in.
 * Reads VERCEL_ENV raw, not sentryEnvironment(): a local production build must never attempt uploads.
 * @returns {boolean}
 */
export function sourcemapUploadsDisabled() {
    return process.env.VERCEL_ENV !== 'production' && process.env.ENABLE_SENTRY_SOURCEMAPS_AT_PREVIEW !== 'true';
}

/**
 * @param {string | undefined} raw
 * @returns {number | undefined} value clamped to [0, 1]; undefined when unset or unparsable
 */
function parseMultiplier(raw) {
    if (!raw) {
        return undefined;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return undefined;
    }
    return Math.min(parsed, 1);
}

/**
 * Multiplier applied to the code-owned vitals sample rate, clamped to (0, 1].
 * @returns {number | undefined} undefined when unset, unparsable, or not positive — vitals sampling off
 */
export function vitalsSampleRateMultiplier() {
    const multiplier = parseMultiplier(process.env.NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE);
    return multiplier === 0 ? undefined : multiplier;
}

/**
 * Multiplier applied to the baseline trace rate of one runtime, clamped to [0, 1] — 0 mutes it.
 * @param {'client' | 'server' | 'edge'} context
 * @returns {number | undefined} undefined when unset or unparsable — baseline applies unchanged
 */
export function traceSampleRateMultiplier(context) {
    switch (context) {
        case 'client':
            return parseMultiplier(process.env.NEXT_PUBLIC_TELEMETRY_TRACE_SAMPLE_RATE_CLIENT);
        case 'edge':
            // Edge is "just server" to developers; the EDGE var exists only for targeted overrides.
            // Parse each var separately so an unparsable EDGE value falls back to SERVER instead of masking it.
            return (
                parseMultiplier(process.env.TELEMETRY_TRACE_SAMPLE_RATE_EDGE) ??
                parseMultiplier(process.env.TELEMETRY_TRACE_SAMPLE_RATE_SERVER)
            );
        case 'server':
            return parseMultiplier(process.env.TELEMETRY_TRACE_SAMPLE_RATE_SERVER);
    }
}
