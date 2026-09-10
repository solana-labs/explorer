import { clientSentryDsn, serverSentryDsn, traceSampleRateMultiplier } from './env.mjs';
import { vitalsTraceSampleRate } from './vitals.mjs';

/**
 * @typedef {'client' | 'server' | 'edge'} RuntimeContext
 */

// Error events are rare and load-bearing; every runtime keeps them all.
const SAMPLE_RATES = {
    client: 1,
    edge: 1,
    server: 1,
};

// Server traces are ~5 spans each; browser pageloads emit hundreds, so client/edge stay near zero.
const TRACE_SAMPLE_RATES = {
    client: 1 / 100000000,
    edge: 1 / 100000000,
    server: 1 / 100000,
};

/**
 * Creates the common Sentry configuration for all runtimes
 * @param {RuntimeContext} context - The runtime context (client, server, or edge)
 * @returns {import('@sentry/core').Options} Sentry configuration options
 */
export function createSentryConfig(context) {
    return {
        dsn: context === 'client' ? clientSentryDsn() : serverSentryDsn(),

        sampleRate: SAMPLE_RATES[context],

        // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
        tracesSampler: (/** @type {import('@sentry/core').TracesSamplerSamplingContext} */ samplingContext) => {
            // Don't sample .well-known
            if (samplingContext.name.includes('/.well-known')) {
                return 0;
            }

            // Don't sample infrastructure requests:
            // - GET https://iad1.suspense-cache.vercel-infra.com/v1/suspense-cache/*
            if (samplingContext.name.includes('suspense-cache.vercel-infra.com')) {
                return 0;
            }

            // Vitals sampling off → the baseline map rate applies.
            if (context === 'client') {
                const vitalsRate = vitalsTraceSampleRate(samplingContext);
                if (vitalsRate !== undefined) {
                    return vitalsRate;
                }
            }

            // TODO: enable once a client DSN exists so a sampled client trace keeps its server half; callers
            // can force sampling via sentry-trace headers, so weigh that first:
            // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/sampling/#inheritance
            // if (samplingContext.parentSampled !== undefined) {
            //     return samplingContext.parentSampled;
            // }

            // Env multiplier dampens a runtime's baseline in an emergency (0 mutes); unset = unchanged.
            return TRACE_SAMPLE_RATES[context] * (traceSampleRateMultiplier(context) ?? 1);
        },

        // Enable logs to be sent to Sentry
        enableLogs: false,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        environment: process.env.NODE_ENV,
    };
}

/**
 * Creates the Sentry build configuration for webpack plugin
 * @returns {import('@sentry/nextjs').SentryBuildOptions} Sentry build configuration options
 */
export function createSentryBuildConfig() {
    return {
        // For all available options, see:
        // https://www.npmjs.com/package/@sentry/webpack-plugin#options

        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PRJ,

        // Only print logs for uploading source maps in CI
        silent: !process.env.CI,

        // Don't send telemetry about the build to Sentry.
        telemetry: false,

        // Webpack plugin options
        webpack: {
            // Enables automatic instrumentation of Vercel Cron Monitors
            automaticVercelMonitors: true,
            // Automatically tree-shake Sentry logger statements to reduce bundle size
            treeshake: {
                removeDebugLogging: true,
            },
        },

        // Previews don't need symbolicated traces — uploading 800+ maps × 3 runtimes added ~90s/build.
        // ENABLE_SENTRY_SOURCEMAPS_AT_PREVIEW (internal) temporarily opts previews into uploads.
        sourcemaps: {
            disable:
                process.env.VERCEL_ENV !== 'production' && process.env.ENABLE_SENTRY_SOURCEMAPS_AT_PREVIEW !== 'true',
        },

        // Off: widening pulls node_modules chunks into the upload.
        widenClientFileUpload: false,
    };
}
