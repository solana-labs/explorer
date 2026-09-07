import type { TelemetryProvider } from '../server.js';

const GA4_COLLECT_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

export type Ga4ProviderOptions = {
    measurementId: string;
    apiSecret: string;
};

// FNV-1a; GA4 needs a numeric-looking session_id and the client id is already pseudonymous, so a cheap stable hash suffices.
function deriveSessionId(clientId: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < clientId.length; index += 1) {
        hash ^= clientId.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return String(hash >>> 0);
}

/** GA4 Measurement Protocol provider — `context.clientId` becomes the GA4 `client_id`; injects `session_id` and `engagement_time_msec` into event params, overriding caller-supplied values. */
export function createGa4Provider(options: Ga4ProviderOptions): TelemetryProvider {
    const query = new URLSearchParams({ api_secret: options.apiSecret, measurement_id: options.measurementId });
    const url = `${GA4_COLLECT_ENDPOINT}?${query.toString()}`;
    return {
        name: 'ga4',
        async send(event, context) {
            // Without session_id + engagement_time_msec GA4 keeps MP events in Realtime only and drops them from processed reports.
            const response = await fetch(url, {
                body: JSON.stringify({
                    client_id: context.clientId,
                    events: [
                        {
                            name: event.name,
                            params: {
                                ...event.params,
                                // Minimum positive value — no engagement claim; latency lives in the duration_ms metric.
                                engagement_time_msec: 1,
                                session_id: deriveSessionId(context.clientId),
                            },
                        },
                    ],
                }),
                headers: { 'content-type': 'application/json' },
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error(`GA4 collect responded with HTTP ${response.status}`);
            }
        },
    };
}
