/** Server-only Sentry surface: `wrapMcpServerWithSentry` is absent from the browser build of
 * @sentry/nextjs, so it must not transit ./index, which client components import. */
export { wrapMcpServerWithSentry } from '@sentry/nextjs';
