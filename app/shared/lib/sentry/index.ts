/**
 * Production error monitoring and tracing via Sentry.
 *
 * Project-specific Sentry wrappers. `captureException` and `captureMessage`
 * are intentionally not re-exported — use the Logger instead:
 * - `Logger.panic(error)` for exceptions
 * - `Logger.error(msg, { sentry: true })` or `Logger.warn(msg, { sentry: true })` for notable events
 *   (server-only; `sentry: 'always'` also reports from the browser)
 */
// No server-only re-exports here (e.g. wrapMcpServerWithSentry): the browser build of @sentry/nextjs
// lacks them, and this barrel is imported from client components.
export { addBreadcrumb, captureFeedback, startSpan, setTag, setExtra, setContext, withScope } from '@sentry/nextjs';
export { withTraceData } from './trace-data';
export { SentryErrorBoundary } from './SentryErrorBoundary';
