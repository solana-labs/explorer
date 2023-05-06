// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    dsn: 'https://5efdc15b4828434fbe949b5daed472be@o434108.ingest.sentry.io/5390542',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,
});
