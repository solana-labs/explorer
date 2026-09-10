import type { ErrorEvent } from '@sentry/core';
import { describe, expect, it } from 'vitest';

import { CLIENT_REPORT_ALLOWED, CLIENT_REPORT_TAG } from '../client-report.mjs';
import { createSentryConfig } from '../config.mjs';

function clientBeforeSend() {
    const { beforeSend } = createSentryConfig('client');
    if (!beforeSend) throw new Error('client config is expected to define beforeSend');
    return beforeSend;
}

describe('createSentryConfig beforeSend guard', () => {
    it('should define beforeSend only for the client runtime', () => {
        expect(createSentryConfig('client').beforeSend).toBeTypeOf('function');
        expect(createSentryConfig('server').beforeSend).toBeUndefined();
        expect(createSentryConfig('edge').beforeSend).toBeUndefined();
    });

    it('should pass browser events carrying the Logger opt-in tag', () => {
        const event: ErrorEvent = { tags: { [CLIENT_REPORT_TAG]: CLIENT_REPORT_ALLOWED }, type: undefined };

        expect(clientBeforeSend()(event, {})).toBe(event);
    });

    it('should drop browser events without the opt-in tag', () => {
        expect(clientBeforeSend()({ type: undefined }, {})).toBeNull();
        expect(clientBeforeSend()({ tags: {}, type: undefined }, {})).toBeNull();
    });

    it('should drop browser events whose tag carries any other value', () => {
        const event: ErrorEvent = { tags: { [CLIENT_REPORT_TAG]: 'spoofed' }, type: undefined };

        expect(clientBeforeSend()(event, {})).toBeNull();
    });
});
