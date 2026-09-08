import { type GA4EventName, trackEvent } from './track-event';

export enum WebVitalsEvent {
    CLS = 'wv_cls',
    FCP = 'wv_fcp',
    INP = 'wv_inp',
    LCP = 'wv_lcp',
    TTFB = 'wv_ttfb',
}

type _WebVitalsEventNames = `${WebVitalsEvent}`;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- forces a compile error if any enum value exceeds the limit
const _assertGA4Length: _WebVitalsEventNames extends GA4EventName<_WebVitalsEventNames> ? true : never = true;

export type WebVitalsMetric = {
    name: string;
    rating: 'good' | 'needs-improvement' | 'poor';
    value: number;
};

const EVENT_BY_METRIC_NAME: Record<string, WebVitalsEvent | undefined> = {
    CLS: WebVitalsEvent.CLS,
    FCP: WebVitalsEvent.FCP,
    INP: WebVitalsEvent.INP,
    LCP: WebVitalsEvent.LCP,
    TTFB: WebVitalsEvent.TTFB,
};

export const webVitalsAnalytics = {
    trackMetric({ name, rating, value }: WebVitalsMetric): void {
        const event = EVENT_BY_METRIC_NAME[name];

        // useReportWebVitals also emits the deprecated FID, which INP replaced.
        if (!event) {
            return;
        }

        trackEvent(event, { metric_rating: rating, metric_value: roundMetricValue(event, value) });
    },
};

// CLS is a unitless ratio near zero. Every other vital is milliseconds, where
// sub-millisecond precision is noise.
function roundMetricValue(event: WebVitalsEvent, value: number): number {
    return event === WebVitalsEvent.CLS ? Math.round(value * 10_000) / 10_000 : Math.round(value);
}
