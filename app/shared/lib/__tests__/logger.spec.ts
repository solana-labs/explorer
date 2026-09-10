import { beforeEach, vi } from 'vitest';

// Undo the global Logger mock so we can test the real implementation.
vi.unmock('@/app/shared/lib/logger');

// Mock @sentry/nextjs since Logger imports captureException/captureMessage/withScope directly from it.
const captureException = vi.fn();
const captureMessage = vi.fn();
const mockScope = { setExtras: vi.fn(), setLevel: vi.fn(), setTag: vi.fn() };
vi.mock('@sentry/nextjs', () => ({
    captureException: (...args: unknown[]) => captureException(...args),
    captureMessage: (...args: unknown[]) => captureMessage(...args),
    withScope: (cb: (scope: typeof mockScope) => void) => cb(mockScope),
}));

const { Logger } = await import('../logger');

describe('Logger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        captureException.mockClear();
        captureMessage.mockClear();
        mockScope.setLevel.mockClear();
        mockScope.setExtras.mockClear();
        mockScope.setTag.mockClear();
    });

    describe('isLoggable gating', () => {
        it('should suppress all output when NEXT_LOG_LEVEL is unset', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

            Logger.error('should not appear');

            expect(spy).not.toHaveBeenCalled();
        });

        it('should suppress output when NEXT_LOG_LEVEL is not a valid number', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', 'abc');
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('should not appear');

            expect(spy).not.toHaveBeenCalled();
        });

        it('should log error when NEXT_LOG_LEVEL >= ERROR (1)', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '1');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('boom');

            Logger.error(err);

            expect(spy).toHaveBeenCalledWith(err);
        });

        it('should suppress debug when NEXT_LOG_LEVEL = INFO (3)', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '3');
            const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

            Logger.debug('verbose'); // eslint-disable-line testing-library/no-debugging-utils

            expect(spy).not.toHaveBeenCalled();
        });

        it('should log debug when NEXT_LOG_LEVEL = DEBUG (4)', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '4');
            const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

            Logger.debug('verbose'); // eslint-disable-line testing-library/no-debugging-utils

            expect(spy).toHaveBeenCalledWith('verbose');
        });
    });

    describe('formatArgs', () => {
        beforeEach(() => {
            vi.stubEnv('NEXT_LOG_LEVEL', '4');
        });

        it('should pass only the message when no context is given', () => {
            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

            Logger.info('hello');

            expect(spy).toHaveBeenCalledWith('hello');
        });

        it('should pass context as a second argument', () => {
            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

            Logger.info('request failed', { status: 500, url: '/api' });

            expect(spy).toHaveBeenCalledWith('request failed', { status: 500, url: '/api' });
        });

        it('should log Error with context when first arg is an Error', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('oops');

            Logger.error(err, { module: 'x' });

            expect(spy).toHaveBeenCalledWith(err, { module: 'x' });
        });

        it('should log Error alone when no context is given', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('oops');

            Logger.error(err);

            expect(spy).toHaveBeenCalledWith(err);
        });
    });

    describe('panic', () => {
        it('should call captureException with fatal level', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '0');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('fatal');

            Logger.panic(err);

            expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
            expect(captureException).toHaveBeenCalledWith(err);
        });

        it('should forward sentryExtras to Sentry scope', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '0');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('fatal');

            Logger.panic(err, { sentryExtras: { endpoint: '/api', module: 'rpc' } });

            expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
            expect(mockScope.setExtras).toHaveBeenCalledWith({ endpoint: '/api', module: 'rpc' });
            expect(captureException).toHaveBeenCalledWith(err);
        });

        it('should not call setExtras when sentryExtras is not provided', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '0');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('fatal');

            Logger.panic(err);

            expect(mockScope.setExtras).not.toHaveBeenCalled();
        });

        it('should not leak sentryExtras into console output', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '0');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('fatal');

            Logger.panic(err, { route: '/api', sentryExtras: { module: 'rpc' } });

            expect(spy).toHaveBeenCalledWith(err, { route: '/api' });
        });

        it('should call captureException even when logging is suppressed', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('fatal');

            Logger.panic(err);

            expect(captureException).toHaveBeenCalledWith(err);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    // jsdom provides `window`, so plain `sentry: true` is the browser path; these describe the server.
    describe('error with sentry', () => {
        beforeEach(() => vi.stubGlobal('window', undefined));

        it('should call captureException with error level when sentry flag is true', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '1');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('rate limit hit');

            Logger.error(err, { sentry: true });

            expect(mockScope.setLevel).toHaveBeenCalledWith('error');
            expect(captureException).toHaveBeenCalledWith(err);
        });

        it('should forward sentryExtras to Sentry scope with error level', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '1');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('rate limit hit');

            Logger.error(err, { sentry: true, sentryExtras: { route: '/api', status: 429 } });

            expect(mockScope.setLevel).toHaveBeenCalledWith('error');
            expect(mockScope.setExtras).toHaveBeenCalledWith({ route: '/api', status: 429 });
            expect(captureException).toHaveBeenCalledWith(err);
        });

        it('should not leak sentryExtras into console output', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '1');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('rate limit hit');

            Logger.error(err, { route: '/api', sentry: true, sentryExtras: { internal: true } });

            expect(spy).toHaveBeenCalledWith(err, { route: '/api' });
        });

        it('should not call captureException by default', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '1');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('normal error');

            Logger.error(err);

            expect(captureException).not.toHaveBeenCalled();
        });

        it('should not leak sentry flag into console output', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '1');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const err = new Error('rate limit hit');

            Logger.error(err, { route: '/api', sentry: true });

            expect(spy).toHaveBeenCalledWith(err, { route: '/api' });
        });

        it('should send "Unrecognized error" to Sentry for non-Error values and log the raw value at debug level', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '4');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

            Logger.error('string error', { sentry: true });

            expect(captureException).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unrecognized error' }));
            expect(mockScope.setLevel).toHaveBeenCalledWith('error');
            expect(debugSpy).toHaveBeenCalledWith('[Logger] non-Error value in error field:', 'string error');
        });
    });

    describe('info', () => {
        it('should log when NEXT_LOG_LEVEL >= INFO (3)', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '3');
            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

            Logger.info('starting up');

            expect(spy).toHaveBeenCalledWith('starting up');
        });

        it('should suppress when NEXT_LOG_LEVEL < INFO', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

            Logger.info('starting up');

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('warn with sentry', () => {
        beforeEach(() => vi.stubGlobal('window', undefined));

        it('should call captureMessage with warning level when sentry flag is true', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('[api] rate limited', { sentry: true });

            expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
            expect(captureMessage).toHaveBeenCalledWith('[api] rate limited');
        });

        it('should forward sentryExtras to Sentry scope with warning level', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('[api] rate limited', { sentry: true, sentryExtras: { route: '/tokens', status: 429 } });

            expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
            expect(mockScope.setExtras).toHaveBeenCalledWith({ route: '/tokens', status: 429 });
            expect(captureMessage).toHaveBeenCalledWith('[api] rate limited');
        });

        it('should not leak sentryExtras into console output', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('[api] rate limited', { route: '/tokens', sentry: true, sentryExtras: { internal: true } });

            expect(spy).toHaveBeenCalledWith('[api] rate limited', { route: '/tokens' });
        });

        it('should not call captureMessage by default', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('just a warning');

            expect(captureMessage).not.toHaveBeenCalled();
        });

        it('should not leak sentry flag into console output', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('[api] rate limited', { route: '/tokens', sentry: true });

            expect(spy).toHaveBeenCalledWith('[api] rate limited', { route: '/tokens' });
        });

        it('should not tag server captures with the client report tag', () => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            Logger.warn('[api] rate limited', { sentry: true });

            expect(captureMessage).toHaveBeenCalled();
            expect(mockScope.setTag).not.toHaveBeenCalled();
        });
    });

    // jsdom keeps `window` defined, which is the browser runtime to the Logger.
    describe('browser gating', () => {
        beforeEach(() => {
            vi.stubEnv('NEXT_LOG_LEVEL', '2');
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        it('should not call captureException in the browser when sentry is true', () => {
            Logger.error(new Error('server-minded call site'), { sentry: true });

            expect(captureException).not.toHaveBeenCalled();
        });

        it('should not call captureMessage in the browser when sentry is true', () => {
            Logger.warn('[api] rate limited', { sentry: true });

            expect(captureMessage).not.toHaveBeenCalled();
        });

        it('should call captureException in the browser when sentry is "always"', () => {
            const err = new Error('client-only failure');

            Logger.error(err, { sentry: 'always' });

            expect(captureException).toHaveBeenCalledWith(err);
        });

        it('should call captureMessage in the browser when sentry is "always"', () => {
            Logger.warn('[idl] fetch failed', { sentry: 'always' });

            expect(captureMessage).toHaveBeenCalledWith('[idl] fetch failed');
        });

        // The client config's beforeSend drops untagged events, so an untagged capture would vanish.
        it('should tag browser captures so the client beforeSend passes them through', () => {
            Logger.error(new Error('client-only failure'), { sentry: 'always' });

            expect(mockScope.setTag).toHaveBeenCalledWith('client_report', 'allowed');
        });

        it('should capture panic in the browser without an opt-in and tag it', () => {
            const err = new Error('render crash');

            Logger.panic(err);

            expect(captureException).toHaveBeenCalledWith(err);
            expect(mockScope.setTag).toHaveBeenCalledWith('client_report', 'allowed');
        });
    });
});
