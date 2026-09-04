'use client';

/** Client-only Sentry surface: `sendFeedback` exists only in the browser entry of @sentry/nextjs,
 * so it cannot be re-exported from ./index, which server code imports. It resolves on confirmed
 * 2xx delivery and rejects on failure (e.g. ad-blocker), unlike fire-and-forget captureFeedback. */
export { sendFeedback } from '@sentry/nextjs';
