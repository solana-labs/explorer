'use client';

import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SignatureContext } from '@components/instruction/SignatureContext';
import { CUProfilingSection } from '@features/cu-profiling';
import { Receipt } from '@features/receipt';
import { isReceiptEnabled } from '@features/receipt';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { useTransactionDetails, useTransactionStatus } from '@providers/transactions';
import { useFetchTransactionDetails } from '@providers/transactions/parsed';
import { getBase58Encoder } from '@solana/kit';
import { TransactionSignature } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import { SignatureProps } from '@utils/index';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef, useState } from 'react';

import { AccountsCard } from '@/app/features/transaction/ui/AccountsCard';
import { InstructionsSection } from '@/app/features/transaction/ui/InstructionsSection';
import { ProgramLogSection } from '@/app/features/transaction/ui/ProgramLogSection';
import { SummaryCard } from '@/app/features/transaction/ui/SummaryCard';
import { generateTokenBalanceRows, TokenBalancesCard } from '@/app/features/transaction/ui/TokenBalancesCard';
import { AutoRefresh, useAutoRefreshState } from '@/app/shared/lib/use-auto-refresh';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import { BaseNavigationTabs } from '@/app/shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { PageHeader, PageLayout, PageSections } from '@/app/shared/ui/page-layout';
import { useLogsPanelScrollSync } from '@/app/tx/[signature]/use-logs-scroll-sync';
import useTabVisibility from '@/app/utils/use-tab-visibility';

const BASE58_ENCODER = getBase58Encoder();

const ALL_TRANSACTION_TABS = [
    { path: 'summary', title: 'Summary' },
    { path: 'accounts', title: 'Accounts' },
    { path: 'tokens', title: 'Tokens' },
    { path: 'programs', title: 'Programs' },
    { path: 'logs', title: 'Logs' },
];

const ZERO_CONFIRMATION_BAILOUT = 5;

type Props = Readonly<{
    params: SignatureProps;
}>;

export function TransactionDetailsPageClient({ params: { signature: raw } }: Props) {
    let signature: TransactionSignature | undefined;
    const searchParams = useSearchParams();

    try {
        const decoded = BASE58_ENCODER.encode(raw);
        if (decoded.length === 64) {
            signature = raw;
        }
    } catch (_err) {
        /* empty */
    }

    const status = useTransactionStatus(signature);
    const clusterStatus = useCluster().status;
    const [zeroConfirmationRetries, setZeroConfirmationRetries] = useState(0);

    const { visible: isTabVisible } = useTabVisibility();
    const autoRefresh = useAutoRefreshState({
        bailedOut: zeroConfirmationRetries >= ZERO_CONFIRMATION_BAILOUT,
        enabled: Boolean(status?.data?.info && status.data.info.confirmations !== 'max'),
        isTabVisible,
    });

    useEffect(() => {
        if (status?.status === FetchStatus.Fetched && status.data?.info && status.data.info.confirmations === 0) {
            setZeroConfirmationRetries(retries => retries + 1);
        }
    }, [status]);

    useEffect(() => {
        if (status?.status === FetchStatus.Fetching && autoRefresh === AutoRefresh.BailedOut) {
            setZeroConfirmationRetries(0);
        }
    }, [status, autoRefresh, setZeroConfirmationRetries]);

    if (isReceiptEnabled && searchParams.get('view') === 'receipt' && signature) {
        return <Receipt signature={signature} autoRefresh={autoRefresh} />;
    }

    return (
        // The translucent-green text-selection highlight (`#13d89b` at 25% alpha) is a one-off colour,
        // not a token; kept as a literal so the transaction and block pages stay visually in step.
        <PageLayout className="selection:bg-[#13d89b40] selection:text-inherit">
            <PageSections>
                <PageHeader eyebrow="Details" title="Transaction" />

                {signature === undefined ? (
                    <ErrorCard text={`Signature "${raw}" is not valid`} />
                ) : clusterStatus === ClusterStatus.Failure ? (
                    <ErrorCard text="RPC is not responding. Please change your RPC url and try again." />
                ) : (
                    <SignatureContext.Provider value={signature}>
                        <SummaryCard signature={signature} autoRefresh={autoRefresh} />
                        <Suspense fallback={<LoadingCard message="Loading transaction details" />}>
                            <DetailsSection signature={signature} />
                        </Suspense>
                    </SignatureContext.Provider>
                )}
            </PageSections>
        </PageLayout>
    );
}

function DetailsSection({ signature }: SignatureProps) {
    const details = useTransactionDetails(signature);
    const fetchDetails = useFetchTransactionDetails();
    const status = useTransactionStatus(signature);
    const transactionWithMeta = details?.data?.transactionWithMeta;
    const transaction = transactionWithMeta?.transaction;
    const message = transaction?.message;
    const { status: clusterStatus } = useCluster();
    const { isXxl } = useBreakpoint();
    const refreshDetails = () => fetchDetails(signature);

    const logsPanelRef = useRef<HTMLDivElement>(null);

    // Sync the sticky logs panel with the active instruction as the page scrolls.
    // Manual interaction (wheel, scrollbar, keyboard) takes over for 2s before auto-sync resumes.
    useLogsPanelScrollSync({ enabled: isXxl, panelRef: logsPanelRef, watchValue: transactionWithMeta });

    useEffect(() => {
        if (!details && clusterStatus === ClusterStatus.Connected && status?.status === FetchStatus.Fetched) {
            fetchDetails(signature);
        }
    }, [signature, clusterStatus, status]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!status?.data?.info) {
        return null;
    } else if (!details || details.status === FetchStatus.Fetching) {
        return <LoadingCard />;
    } else if (details.status === FetchStatus.FetchFailed) {
        return <ErrorCard retry={refreshDetails} text="Failed to fetch details" />;
    } else if (!transactionWithMeta || !message) {
        return <ErrorCard text="Details are not available" />;
    }

    const meta = transactionWithMeta.meta;
    const accountKeys = transactionWithMeta.transaction.message.accountKeys;
    const hasTokens =
        meta?.preTokenBalances &&
        meta?.postTokenBalances &&
        accountKeys &&
        generateTokenBalanceRows(meta.preTokenBalances, meta.postTokenBalances, accountKeys).length > 0;

    const baseTabs = hasTokens ? ALL_TRANSACTION_TABS : ALL_TRANSACTION_TABS.filter(t => t.path !== 'tokens');
    const tabs = isXxl
        ? baseTabs
              .filter(t => t.path !== 'logs')
              .map(t => (t.path === 'programs' ? { path: 'programs', title: 'Programs & Logs' } : t))
        : baseTabs;

    return (
        <>
            <BaseNavigationTabs
                scrollSpy
                tabs={tabs}
                buildHref={path => `#${path}`}
                wrapperClassName="bg-heavy-metal-900"
                className="gap-5"
            />
            <Suspense fallback={<LoadingCard message="Loading accounts" />}>
                <AccountsCard signature={signature} />
            </Suspense>
            <TokenBalancesCard signature={signature} />
            <div className="flex flex-col space-y-9 pb-10 xxl:relative xxl:left-1/2 xxl:w-screen xxl:-translate-x-1/2 xxl:flex-row xxl:items-start xxl:gap-6 xxl:space-y-0 xxl:px-6">
                <div className="xxl:min-w-0 xxl:flex-[1_1_0%] xxl:overflow-hidden">
                    <InstructionsSection signature={signature} />
                </div>
                <div
                    ref={logsPanelRef}
                    className="scrollbar-hide xxl:sticky xxl:top-[70px] xxl:max-h-[calc(100vh-90px)] xxl:min-w-0 xxl:flex-[1_1_0%] xxl:overflow-y-auto xxl:rounded-b-lg"
                    id="logs"
                >
                    <ProgramLogSection signature={signature} />
                    <CUProfilingSection signature={signature} />
                </div>
            </div>
        </>
    );
}
