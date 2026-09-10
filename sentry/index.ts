import type { Options } from '@sentry/core';
import type { SentryBuildOptions } from '@sentry/nextjs';

// Import the actual implementations from the .mjs file
import {
    createSentryBuildConfig as createSentryBuildConfigMjs,
    createSentryConfig as createSentryConfigMjs,
} from './lib/config.mjs';

type RuntimeContext = 'client' | 'server' | 'edge';

export const createSentryConfig = (context: RuntimeContext): Options => createSentryConfigMjs(context);

export const createSentryBuildConfig = (): SentryBuildOptions => createSentryBuildConfigMjs();
