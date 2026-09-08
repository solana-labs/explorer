import { afterEach, describe, expect, it, vi } from 'vitest';

import { trackEvent } from '../track-event';
import { webVitalsAnalytics, type WebVitalsMetric } from '../web-vitals';

vi.mock('../track-event', () => ({
    trackEvent: vi.fn(),
}));

const mockedTrackEvent = vi.mocked(trackEvent);

function metric(overrides: Partial<WebVitalsMetric> & Pick<WebVitalsMetric, 'name'>): WebVitalsMetric {
    return { rating: 'good', value: 0, ...overrides };
}

describe('webVitalsAnalytics.trackMetric', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['LCP', 'wv_lcp'],
        ['INP', 'wv_inp'],
        ['CLS', 'wv_cls'],
        ['FCP', 'wv_fcp'],
        ['TTFB', 'wv_ttfb'],
    ])('should emit %s as %s', (name, event) => {
        webVitalsAnalytics.trackMetric(metric({ name }));

        expect(mockedTrackEvent).toHaveBeenCalledWith(event, expect.anything());
    });

    it('should pass the rating through', () => {
        webVitalsAnalytics.trackMetric(metric({ name: 'INP', rating: 'needs-improvement', value: 320 }));

        expect(mockedTrackEvent).toHaveBeenCalledWith('wv_inp', {
            metric_rating: 'needs-improvement',
            metric_value: 320,
        });
    });

    it('should round millisecond metrics to whole milliseconds', () => {
        webVitalsAnalytics.trackMetric(metric({ name: 'LCP', value: 2543.6789 }));

        expect(mockedTrackEvent).toHaveBeenCalledWith('wv_lcp', { metric_rating: 'good', metric_value: 2544 });
    });

    it('should keep CLS precision, which whole-number rounding would erase', () => {
        webVitalsAnalytics.trackMetric(metric({ name: 'CLS', value: 0.10456789 }));

        expect(mockedTrackEvent).toHaveBeenCalledWith('wv_cls', { metric_rating: 'good', metric_value: 0.1046 });
    });

    it('should ignore FID, which useReportWebVitals still emits', () => {
        webVitalsAnalytics.trackMetric(metric({ name: 'FID', value: 12 }));

        expect(mockedTrackEvent).not.toHaveBeenCalled();
    });

    it('should ignore an unrecognised metric', () => {
        webVitalsAnalytics.trackMetric(metric({ name: 'Next.js-hydration', value: 12 }));

        expect(mockedTrackEvent).not.toHaveBeenCalled();
    });
});
