# Sentry configuration

`NEXT_PUBLIC_*` values are inlined at build time — every change below needs a redeploy.

When production floods Sentry, adjust in Vercel:

- *Too many transactions* — lower or unset `NEXT_PUBLIC_TELEMETRY_VITALS_SAMPLE_RATE`; unset = near-zero baseline
- *Too many baseline traces* — set the runtime's dampener to a fraction, or `0` to mute:
  `NEXT_PUBLIC_TELEMETRY_TRACE_SAMPLE_RATE_CLIENT`, `TELEMETRY_TRACE_SAMPLE_RATE_SERVER` (covers edge),
  `TELEMETRY_TRACE_SAMPLE_RATE_EDGE` (edge override)
- *Too many errors* — unset `NEXT_PUBLIC_SENTRY_DSN` (browser) or `SENTRY_DSN` (server/edge); reporting stops entirely

Code-owned rates live in `SAMPLE_RATES` (errors) and `TRACE_SAMPLE_RATES` (traces) in `lib/config.mjs`, and
`VITALS_TRACE_SAMPLE_RATE` (`lib/vitals.mjs`).
