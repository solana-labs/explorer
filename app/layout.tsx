import './scss/theme-dark.scss';

import { ClusterModal } from '@components/ClusterModal';
import { ClusterStatusBanner } from '@components/ClusterStatusButton';
import { MessageBanner } from '@components/MessageBanner';
import { Navbar } from '@components/Navbar';
import { SearchBar } from '@components/SearchBar';
import { AccountsProvider } from '@providers/accounts';
import { BlockProvider } from '@providers/block';
import { ClusterProvider } from '@providers/cluster';
import { EpochProvider } from '@providers/epoch';
import { MintsProvider } from '@providers/mints';
import { RichListProvider } from '@providers/richList';
import { ScrollAnchorProvider } from '@providers/scroll-anchor';
import { StatsProvider } from '@providers/stats';
import { SupplyProvider } from '@providers/supply';
import { TransactionsProvider } from '@providers/transactions';
import { Rubik } from 'next/font/google';
import Script from 'next/script';
import { Metadata } from 'next/types';

export const metadata: Metadata = {
    description: 'Inspect transactions, accounts, blocks, and more on the Solana blockchain',
    manifest: '/manifest.json',
    title: 'Explorer | Solana',
    viewport: {
        initialScale: 1,
        maximumScale: 1,
        width: 'device-width',
    },
};

const rubikFont = Rubik({
    display: 'swap',
    subsets: ['latin'],
    variable: '--explorer-default-font',
    weight: ['300', '400', '700'],
});

function GoogleAnalytics() {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${rubikFont.variable}`}>
            <GoogleAnalytics />
            <body>
                <ScrollAnchorProvider>
                    <ClusterProvider>
                        <StatsProvider>
                            <SupplyProvider>
                                <RichListProvider>
                                    <AccountsProvider>
                                        <BlockProvider>
                                            <EpochProvider>
                                                <MintsProvider>
                                                    <TransactionsProvider>
                                                        <ClusterModal />
                                                        <div className="main-content pb-4">
                                                            <Navbar />
                                                            <MessageBanner />
                                                            <ClusterStatusBanner />
                                                            <SearchBar />
                                                            {children}
                                                        </div>
                                                    </TransactionsProvider>
                                                </MintsProvider>
                                            </EpochProvider>
                                        </BlockProvider>
                                    </AccountsProvider>
                                </RichListProvider>
                            </SupplyProvider>
                        </StatsProvider>
                    </ClusterProvider>
                </ScrollAnchorProvider>
            </body>
        </html>
    );
}
