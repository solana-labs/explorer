import Script from 'next/script';

export default function Analytics() {
    const safeAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.replace("'", "\\'");
    if (!safeAnalyticsId) {
        return null;
    }
    return (
        <>
            {/* Global site tag (gtag.js) - Google Analytics  */}
            <Script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${safeAnalyticsId}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics-initialization" strategy="afterInteractive">
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
