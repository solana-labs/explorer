import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGa4Provider } from '../ga4.js';

const OPTIONS = { apiSecret: 'secret&value', measurementId: 'G-TEST123' };
const EVENT = { name: 'mcp_tool_call', params: { status: 'success', tool: 'ping' } };
const CONTEXT = { clientId: 'client-1' };

function stubFetch() {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function sentParams(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0) {
    const [, init] = fetchMock.mock.calls[callIndex];
    return JSON.parse(init.body).events[0].params;
}

describe('createGa4Provider', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should post the event to the Measurement Protocol collect endpoint', async () => {
        const fetchMock = stubFetch();
        const provider = createGa4Provider(OPTIONS);

        await provider.send(EVENT, CONTEXT);

        expect(provider.name).toBe('ga4');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(
            'https://www.google-analytics.com/mp/collect?api_secret=secret%26value&measurement_id=G-TEST123',
        );
        expect(init.method).toBe('POST');
        expect(init.headers).toEqual({ 'content-type': 'application/json' });
        expect(JSON.parse(init.body)).toEqual({
            client_id: 'client-1',
            events: [
                {
                    name: 'mcp_tool_call',
                    params: {
                        engagement_time_msec: 1,
                        // FNV-1a of 'client-1' — pins that session_id stays a GA4-friendly decimal string.
                        session_id: '3136858344',
                        status: 'success',
                        tool: 'ping',
                    },
                },
            ],
        });
    });

    it('should send a constant engagement_time_msec of 1 and leave duration_ms untouched', async () => {
        const fetchMock = stubFetch();
        const provider = createGa4Provider(OPTIONS);

        await provider.send({ name: 'mcp_tool_call', params: { duration_ms: 250, tool: 'ping' } }, CONTEXT);

        expect(sentParams(fetchMock)).toEqual({
            duration_ms: 250,
            engagement_time_msec: 1,
            session_id: '3136858344',
            tool: 'ping',
        });
    });

    it('should override caller-supplied session_id and engagement_time_msec with derived values', async () => {
        const fetchMock = stubFetch();
        const provider = createGa4Provider(OPTIONS);

        await provider.send(
            { name: 'mcp_tool_call', params: { engagement_time_msec: 999, session_id: 'caller', tool: 'ping' } },
            CONTEXT,
        );

        expect(sentParams(fetchMock)).toEqual({
            engagement_time_msec: 1,
            session_id: '3136858344',
            tool: 'ping',
        });
    });

    it('should derive a session_id that is stable per client id and distinct across client ids', async () => {
        const fetchMock = stubFetch();
        const provider = createGa4Provider(OPTIONS);

        await provider.send(EVENT, { clientId: 'client-1' });
        await provider.send(EVENT, { clientId: 'client-1' });
        await provider.send(EVENT, { clientId: 'client-2' });

        const [first, second, third] = [0, 1, 2].map(index => sentParams(fetchMock, index).session_id);
        expect(first).toBe(second);
        expect(third).not.toBe(first);
    });

    it('should reject when the collect endpoint responds with a non-ok status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
        const provider = createGa4Provider(OPTIONS);

        await expect(provider.send(EVENT, CONTEXT)).rejects.toThrow('GA4 collect responded with HTTP 403');
    });
});
