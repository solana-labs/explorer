'use client';

import {
    HistoryFilterChips,
    HistoryFilterTrigger,
    useClearHistoryFilters,
    useHistoryFilters,
} from '@components/account/history/HistoryFilterBar';
import { getTransactionRows } from '@components/account/HistoryCardComponents';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Signature } from '@components/common/Signature';
import { Slot } from '@components/common/Slot';
import { Badge } from '@components/shared/ui/badge';
import { FetchStatus } from '@providers/cache';
import { address as toAddress } from '@solana/kit';
import { displayTimestampUtc } from '@utils/date';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import { useVisibility } from '@/app/shared/lib/visibility';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { BaseTable } from '@/app/shared/ui/Table';

import { isGtfaDisabled } from '../lib/gtfa-disabled-addresses';
import { useAccountHistory, useHistoryFiltersSupported, useResetAccountHistory } from '../model/use-account-history';
import { useFetchAccountHistory } from '../model/use-fetch-account-history';
import { useResolvedInstructionSummaries } from '../model/use-resolved-instruction-summaries';
import { BaseTransactionHistoryCard, STATUS_BADGE, type TransactionHistoryRowView } from './BaseTransactionHistoryCard';
import { CompactKeyValue } from './CompactKeyValue';
import { InstructionList, InstructionListSkeleton } from './InstructionList';
import { RawDataSizeField } from './RawDataSizeField';
import { TransactionDetailsDrawer } from './TransactionDetailsDrawer';

export function TransactionHistoryCard({ address }: { address: string }) {
    const historyAddress = useMemo(() => toAddress(address), [address]);
    // One breakpoint subscription for the whole card — each row reads `isLg` as a prop rather than
    // registering its own matchMedia listeners (25 rows × several media queries otherwise).
    const { isLg } = useBreakpoint();
    const filters = useHistoryFilters();
    const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
    const filtersKey = JSON.stringify(filters);
    const history = useAccountHistory(address);
    const fetchAccountHistory = useFetchAccountHistory(25, filters);
    const resetHistory = useResetAccountHistory();
    const filtersSupported = useHistoryFiltersSupported() && !isGtfaDisabled(address);
    const clearFilters = useClearHistoryFilters();

    // Signatures only — the parsed transactions for instruction names / raw bytes are fetched lazily
    // per row, one at a time, so the page never batch-hammers the RPC into 429s.
    const refresh = useCallback(
        () => fetchAccountHistory(historyAddress, false, true),
        [fetchAccountHistory, historyAddress],
    );
    const loadMore = useCallback(
        () => fetchAccountHistory(historyAddress, false),
        [fetchAccountHistory, historyAddress],
    );

    const rows: TransactionHistoryRowView[] = history?.data?.fetched
        ? getTransactionRows(history.data.fetched).map(row => ({
              blockTime: row.blockTime,
              signature: row.signature,
              slot: row.slot,
              status: row.err ? 'failed' : 'success',
          }))
        : [];

    useEffect(() => {
        if (!history) {
            refresh();
        }
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

    const previousFiltersKey = useRef(filtersKey);
    useEffect(() => {
        if (previousFiltersKey.current !== filtersKey) {
            previousFiltersKey.current = filtersKey;
            resetHistory(address);
            refresh();
        }
    }, [filtersKey, address, resetHistory, refresh]);

    useEffect(() => {
        if (!filtersSupported && hasActiveFilters) {
            clearFilters();
        }
    }, [filtersSupported, hasActiveFilters, clearFilters]);

    if (!history?.data) {
        return !history || history.status === FetchStatus.Fetching ? (
            <LoadingCard message="Loading history" />
        ) : (
            <ErrorCard retry={refresh} text="Failed to fetch transaction history" />
        );
    }

    return (
        <BaseTransactionHistoryCard
            rows={rows}
            fetching={history.status === FetchStatus.Fetching}
            foundOldest={history.data.foundOldest}
            onRefresh={refresh}
            onLoadMore={loadMore}
            headerActions={<HistoryFilterTrigger address={address} {...filters} />}
            headerSubRow={hasActiveFilters ? <HistoryFilterChips {...filters} /> : undefined}
            renderRow={(row, hasTimestamps) => (
                <TransactionRow key={row.signature} row={row} hasTimestamps={hasTimestamps} isLg={isLg} />
            )}
        />
    );
}

function TransactionRow({
    row,
    hasTimestamps,
    isLg,
}: {
    row: TransactionHistoryRowView;
    hasTimestamps: boolean;
    isLg: boolean;
}) {
    const { signature, slot, blockTime, status } = row;
    const { isVisible, ref } = useVisibility<HTMLTableRowElement>(true);
    const instructionNames = useResolvedInstructionSummaries(signature, isVisible);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // Mount the mobile drawer only once the row is first tapped — otherwise every row would mount a
    // closed drawer (with its own raw-tx subscription) up front.
    const [drawerMounted, setDrawerMounted] = useState(false);
    const badge = STATUS_BADGE[status];

    // If the viewport crosses to desktop while the drawer is open, close it gracefully
    useEffect(() => {
        if (isLg) setDrawerOpen(false);
    }, [isLg]);

    const openDrawer = () => {
        setDrawerMounted(true);
        setDrawerOpen(true);
    };

    const programsBlock =
        instructionNames !== undefined && instructionNames.length > 0 ? (
            <InstructionList instructions={instructionNames} />
        ) : instructionNames === undefined ? (
            <InstructionListSkeleton />
        ) : (
            <span className="text-outer-space-300">---</span>
        );

    const signatureLink = <Signature signature={signature} link />;
    const statusBadge = (
        <Badge ui="dashkit" tone="soft" variant={badge.variant}>
            {badge.label}
        </Badge>
    );

    const handleRowClick = (e: React.MouseEvent) => {
        // Skip the drawer when the user actually clicked a real link/button in the row.
        if (e.target instanceof HTMLElement && e.target.closest('a, button')) return;
        if (!isLg) openDrawer();
    };

    return (
        <>
            <BaseTable.Row ref={ref} onClick={!isLg ? handleRowClick : undefined}>
                <BaseTable.Cell>
                    <div className="hidden lg:block">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 text-sm">{signatureLink}</span>
                            {statusBadge}
                        </div>
                        <div className="mt-1">{programsBlock}</div>
                    </div>

                    <div className="flex flex-col text-sm lg:hidden">
                        <MobileField label="Signature">
                            <div className="flex min-w-0 items-start gap-2">
                                <span className="min-w-0">{signatureLink}</span>
                                {statusBadge}
                            </div>
                        </MobileField>
                        {blockTime ? (
                            <MobileField label="Time">{displayTimestampUtc(blockTime * 1000, true)}</MobileField>
                        ) : null}
                        <MobileField label="Block">
                            {/* Plain text on mobile — the drawer carries the block link. */}
                            <Slot slot={slot} />
                        </MobileField>
                        <MobileField label="Programs">{programsBlock}</MobileField>
                    </div>
                </BaseTable.Cell>

                {hasTimestamps && (
                    <BaseTable.Cell className="w-px text-outer-space-300">
                        {blockTime ? (
                            // Two-line stack: absolute UTC timestamp on top, relative age beneath.
                            <div className="flex flex-col">
                                <span className="text-sm">{displayTimestampUtc(blockTime * 1000, true)}</span>
                                <span className="text-sm">
                                    <RelativeTime date={blockTime * 1000} />
                                </span>
                            </div>
                        ) : (
                            '---'
                        )}
                    </BaseTable.Cell>
                )}

                <BaseTable.Cell className="w-px">
                    <span className="text-sm">
                        <Slot slot={slot} link />
                    </span>
                </BaseTable.Cell>

                {isLg && (
                    <BaseTable.Cell className="w-px">
                        <TransactionRawDataSize signature={signature} isVisible={isVisible} />
                    </BaseTable.Cell>
                )}
            </BaseTable.Row>

            {drawerMounted && (
                <TransactionDetailsDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    signature={signature}
                    slot={slot}
                    blockTime={blockTime}
                    statusLabel={badge.label}
                    statusVariant={badge.variant}
                    instructionNames={instructionNames}
                />
            )}
        </>
    );
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <CompactKeyValue divider={false} label={label}>
            {children}
        </CompactKeyValue>
    );
}

// A transient RPC failure shouldn't strand the Size cell at `-` for the session. `useVisibility` is
// one-shot (isVisible latches true on first intersection and never flips back), so re-intersection can't
// drive a retry — we react to the FetchFailed status instead. Bounded so a persistently-down RPC doesn't
// spin, and delayed so we don't immediately re-hit a rate limit.
const MAX_RAW_FETCH_RETRIES = 3;
const RAW_FETCH_RETRY_DELAY_MS = 1500;

// Byte-size cell that opens the raw data (hex/base64 + copy + download) in a popover.
// Fetches once the row scrolls into view (gated on `isVisible`, like the instruction summaries) so the
// page never fires a getTransaction for every row at once and batch-hammers the RPC into 429s.
function TransactionRawDataSize({ signature, isVisible }: { signature: string; isVisible: boolean }) {
    const fetchRaw = useFetchRawTransaction();
    const rawDetails = useRawTransactionDetails(signature);
    const transactionData = rawDetails?.data?.raw?.messageBytes;
    const loading = rawDetails === undefined || rawDetails.status === FetchStatus.Fetching;
    const retriesRef = useRef(0);

    useEffect(() => {
        if (!isVisible || transactionData) return;
        // First time in view: no provider entry yet — kick off the initial fetch.
        if (rawDetails === undefined) {
            fetchRaw(signature);
            return;
        }
        // Fetch failed: retry a bounded number of times on a delay. The status flips FetchFailed on each
        // failed attempt, re-running this effect; the ref cap stops it once we've exhausted the budget.
        if (rawDetails.status === FetchStatus.FetchFailed && retriesRef.current < MAX_RAW_FETCH_RETRIES) {
            const timer = setTimeout(() => {
                retriesRef.current += 1;
                fetchRaw(signature);
            }, RAW_FETCH_RETRY_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, [isVisible, signature, rawDetails, transactionData, fetchRaw]);

    return (
        <RawDataSizeField
            size={transactionData?.length}
            data={transactionData}
            filename={signature}
            loading={loading}
            // Collapse the fixed button height so the size sits inline with the other cells.
            buttonClassName="relative top-0.5 !h-auto !py-0 !text-sm [&_svg]:!size-3.5"
        />
    );
}
