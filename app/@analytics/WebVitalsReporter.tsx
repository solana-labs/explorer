'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { webVitalsAnalytics } from '@/app/shared/lib/analytics';

export function WebVitalsReporter() {
    // A stable callback identity matters: useReportWebVitals re-subscribes on every
    // change, and a second subscription re-reports metrics that fire more than once.
    useReportWebVitals(webVitalsAnalytics.trackMetric);

    return undefined;
}
