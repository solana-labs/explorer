import type { SeverityLevel } from '@sentry/core';
import { captureException, captureMessage, withScope } from '@sentry/nextjs';

import { CLIENT_REPORT_ALLOWED, CLIENT_REPORT_TAG } from '@/sentry/client-report.mjs';

enum LOG_LEVEL {
    PANIC,
    ERROR,
    WARN,
    INFO,
    DEBUG,
}

type LogContext = Record<string, unknown>;

type SentryExtras = Record<string, unknown>;

type SentryReport = boolean | 'always';

type SentryContext = LogContext & {
    /** `true` also sends the event to Sentry, from the server only; `'always'` reports from the browser too. */
    sentry?: SentryReport;
    /** Extra data sent exclusively to Sentry (not included in console output). */
    sentryExtras?: SentryExtras;
};

type PanicContext = LogContext & {
    /** Extra data sent exclusively to Sentry (not included in console output). */
    sentryExtras?: SentryExtras;
};

/**
 * A log message won't be shown if its level is greater than the NEXT_LOG_LEVEL environment variable.
 *
 * `panic` requires an `Error` instance. `error` accepts any value as the first argument —
 * when an `Error` is passed it is forwarded directly; otherwise a sentinel
 * `Error('Unrecognized error')` is created so Sentry always receives a proper stack trace,
 * and the raw value is logged at debug level.
 * - Tags are inline in the message: `[module]` or `[section:module]`
 * - Dynamic values go in the context object for searchable stable messages
 *
 * Sentry integration (each method always sets the correct severity level via `withScope`):
 * - `panic` (level: `fatal`) — always calls `captureException`, on every runtime.
 * - `error` (level: `error`) — calls `captureException` when `{ sentry: true }`.
 * - `warn`  (level: `warning`) — calls `captureMessage` when `{ sentry: true }`.
 *
 * `sentry: true` reports from the server only — bot-heavy browser traffic must not page Sentry unless a
 * call site deliberately opts in with `sentry: 'always'` (an SSR pass counts as server, so the same call
 * site reports once, not once per runtime). Browser captures are tagged so the client Sentry config's
 * `beforeSend` can drop anything that did not come through here.
 *
 * Use `sentryExtras` to attach data exclusively to the Sentry event.
 * Context fields outside `sentryExtras` are only sent to the console.
 * Internal keys (`sentry`, `sentryExtras`) are always stripped from console output.
 */
class StraightforwardLogger {
    panic(error: Error, context?: PanicContext) {
        // Sentry capture is intentionally not gated by isLoggable — panics must
        // always reach error tracking regardless of the console log level.
        withSentryLevel('fatal', context, () => captureException(error));
        isLoggable(LOG_LEVEL.PANIC) && console.error(error, ...consoleArgs(context));
    }
    error(maybeError: unknown, context?: SentryContext) {
        const error = resolveError(maybeError);
        if (shouldReport(context?.sentry)) {
            withSentryLevel('error', context, () => captureException(error));
        }
        isLoggable(LOG_LEVEL.ERROR) && console.error(error, ...consoleArgs(context));
    }
    warn(message: string, context?: SentryContext) {
        if (shouldReport(context?.sentry)) {
            withSentryLevel('warning', context, () => captureMessage(message));
        }
        isLoggable(LOG_LEVEL.WARN) && console.warn(message, ...consoleArgs(context));
    }
    info(message: string, context?: LogContext) {
        isLoggable(LOG_LEVEL.INFO) && console.info(message, ...consoleArgs(context));
    }
    debug(message: string, context?: LogContext) {
        isLoggable(LOG_LEVEL.DEBUG) && console.debug(message, ...consoleArgs(context));
    }
}

export const Logger = new StraightforwardLogger();

/**
 * Determines if a log message should be output based on its level and the current logging threshold.
 *
 * Compares the expected log level against the NEXT_LOG_LEVEL environment variable.
 * Lower numbers have higher priority (e.g., PANIC=0, ERROR=1, WARN=2, INFO=3, DEBUG=4).
 *
 * @param expectedLevel - The log level of the message to be logged
 * @returns True if the message should be logged, false otherwise.
 *          **All logging is suppressed when NEXT_LOG_LEVEL is not set.**
 *
 * NOTE: NEXT_LOG_LEVEL is a server-side env var (`process.env`) and is not
 * exposed to the browser. Console logging from client-side code is therefore
 * always suppressed — only Sentry captures still work on the client.
 *
 * @example
 * // With NEXT_LOG_LEVEL=3 (INFO level)
 * isLoggable(LOG_LEVEL.ERROR)  // returns true (1 <= 3)
 * isLoggable(LOG_LEVEL.DEBUG)  // returns false (4 > 3)
 */
function isLoggable(expectedLevel: LOG_LEVEL) {
    const currentLevel = process.env.NEXT_LOG_LEVEL ? parseInt(process.env.NEXT_LOG_LEVEL) : undefined;

    function isNullish(value: unknown): value is null | undefined {
        return value === null || value === undefined;
    }

    // do not log if expected level is greater than current one
    return !isNullish(currentLevel) && Number.isFinite(currentLevel) && expectedLevel <= currentLevel;
}

/** Browser reporting is opt-in per call site: `true` was almost always written with the server in mind. */
function shouldReport(sentry: SentryReport | undefined): boolean {
    if (!sentry) return false;
    return sentry === 'always' || typeof window === 'undefined';
}

/** Logs a debug warning when the error field is not a real Error instance. */
function warnIfNotError(value: unknown) {
    if (value instanceof Error) return;
    isLoggable(LOG_LEVEL.DEBUG) && console.debug('[Logger] non-Error value in error field:', value);
}

/**
 * Preserve the original error when it's a real Error instance; otherwise
 * create a sentinel so Sentry still gets a proper stack trace, and log
 * the raw value at debug level for inspection.
 */
function resolveError(value: unknown): Error {
    warnIfNotError(value);
    return value instanceof Error ? value : new Error('Unrecognized error');
}

/** Strips internal keys, returning the user-provided fields or undefined if nothing remains. */
function cleanContext(context?: LogContext): Record<string, unknown> | undefined {
    if (!context) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sentry: _sentry, sentryExtras: _sentryExtras, ...rest } = context;
    return Object.keys(rest).length > 0 ? rest : undefined;
}

/** Sets the severity level and sentryExtras on a Sentry scope, then runs the capture callback. */
function withSentryLevel(
    level: SeverityLevel,
    context: (LogContext & { sentryExtras?: SentryExtras }) | undefined,
    capture: () => void,
) {
    withScope(scope => {
        scope.setLevel(level);
        // The client Sentry config's beforeSend drops browser events without this tag, so a capture
        // that bypasses the Logger cannot report from the browser.
        if (typeof window !== 'undefined') scope.setTag(CLIENT_REPORT_TAG, CLIENT_REPORT_ALLOWED);
        if (context?.sentryExtras) scope.setExtras(context.sentryExtras);
        capture();
    });
}

/** Returns cleaned context as a single-element array for spreading into console calls. */
function consoleArgs(context?: LogContext): unknown[] {
    const clean = cleanContext(context);
    return clean ? [clean] : [];
}
