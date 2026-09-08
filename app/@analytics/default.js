'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { useState } from 'react';

import { useAnalyticsConsent } from '@/app/features/cookie';

import { WebVitalsReporter } from './WebVitalsReporter';

// At full rate Explorer traffic would run far past the included Speed Insights
// allowance; 10% still leaves ample volume for per-route percentiles.
const SPEED_INSIGHTS_SAMPLE_RATE = 0.1;

export default function Analytics() {
    const { isConsentGiven } = useAnalyticsConsent();

    return (
        <>
            {/* Ungated: Speed Insights writes nothing to the device, so the cookie
                banner's scope does not reach it. Everything below feeds gtag. */}
            <SpeedInsights sampleRate={SPEED_INSIGHTS_SAMPLE_RATE} />
            {isConsentGiven && <GoogleTags />}
        </>
    );
}

function GoogleTags() {
    // The reporter waits for gtag rather than mounting alongside it: buffered vitals
    // arrive the instant it subscribes, which beats an afterInteractive script, and
    // trackEvent drops silently when no provider is up. Subscribing late costs
    // nothing, since PerformanceObserver replays what it already saw.
    const [isGtagReady, setIsGtagReady] = useState(false);
    const markGtagReady = () => setIsGtagReady(true);
    const safeAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.replace("'", "\\'");
    const safeTagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID?.replace("'", "\\'");

    if (!safeAnalyticsId && !safeTagId) {
        return null;
    }

    if (safeTagId) {
        return (
            <>
                {isGtagReady && <WebVitalsReporter />}
                <Script id="google-tag-initialization" onReady={markGtagReady}>
                    {`
                    (function(w,d,s,l,i){w[l] = w[l] || [];w[l].push({
                            'gtm.start': new Date().getTime(),
                            event: 'gtm.js'
                        });
                        var f=d.getElementsByTagName(s)[0],
                            j=d.createElement(s),
                            dl=l!='dataLayer'?'&l='+l:'';
                            j.async=true;
                            j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })
                    (window,document,'script','dataLayer','${safeTagId}');
                `}
                </Script>
                <noscript>
                    <iframe
                        src={`https://www.googletagmanager.com/ns.html?id=${safeTagId}`}
                        height="0"
                        width="0"
                        style={{ display: 'none', visibility: 'hidden' }}
                    ></iframe>
                </noscript>
            </>
        );
    }

    // Fallback to Google Analytics if no Tag ID is provided
    return (
        <>
            {isGtagReady && <WebVitalsReporter />}
            {/* Global site tag (gtag.js) - Google Analytics  */}
            <Script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${safeAnalyticsId}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics-initialization" strategy="afterInteractive" onReady={markGtagReady}>
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${safeAnalyticsId}');
                `}
            </Script>
        </>
    );
}
