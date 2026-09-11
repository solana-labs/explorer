'use client';

import { RefreshButton } from '@components/shared/ui/refresh-button';
import { type ReactNode } from 'react';

import { cn } from '@/app/components/shared/utils';
import { Card, CardTitle } from '@/app/shared/ui/Card';
import { HistoryCardFooterContent } from '@/app/shared/ui/HistoryCard';
import { BaseTable } from '@/app/shared/ui/Table';

export const STATUS_BADGE = {
    failed: { label: 'Failed', variant: 'warning' },
    success: { label: 'Success', variant: 'success' },
} as const;

export type TransactionStatus = keyof typeof STATUS_BADGE;

export type TransactionHistoryRowView = {
    signature: string;
    slot: number;
    blockTime: number | null | undefined;
    status: TransactionStatus;
};

export type BaseTransactionHistoryCardProps = {
    rows: TransactionHistoryRowView[];
    fetching: boolean;
    foundOldest: boolean;
    onRefresh: () => void;
    onLoadMore: () => void;
    headerActions?: ReactNode;
    headerSubRow?: ReactNode;
    renderRow: (row: TransactionHistoryRowView, hasTimestamps: boolean) => ReactNode;
};

const TABLE_CLASSES = cn(
    // Shared by both layouts: comfortable line-height, 12px uppercase header. Cells align on the
    // first-line baseline so the signature (with its taller status Badge) lines up with the plain
    // Time/Block/Size text in the same row instead of floating above it.
    '[&_tbody_td]:align-baseline [&_tbody_td]:leading-6 [&_thead_th]:!text-xs',

    // ── Mobile (base): table → stack of cards.
    'overflow-x-clip [&_.overflow-x-auto]:overflow-x-clip',
    '[&_thead]:hidden [&_table]:block [&_tbody]:block [&_tr]:block',
    // Strip every cell's border — the row card owns the frame.
    '[&_tbody_td]:!border-0',
    // First cell becomes the full-width card body: fill the card (!w-auto), drop its padding (!p-0), wrap text.
    '[&_tbody_td:first-child]:block [&_tbody_td:first-child]:!w-auto [&_tbody_td:first-child]:whitespace-normal [&_tbody_td:first-child]:!p-0',
    '[&_tbody_td:not(:first-child)]:hidden',
    '[&_tbody_tr]:mb-2 [&_tbody_tr]:cursor-pointer [&_tbody_tr]:rounded-lg [&_tbody_tr]:border [&_tbody_tr]:border-solid [&_tbody_tr]:border-outer-space-800 [&_tbody_tr]:bg-dk-gray-800-dark [&_tbody_tr]:px-3 [&_tbody_tr]:py-2',
    '[&_tbody_tr:last-child]:mb-0',

    // ── Desktop (lg+): revert the card transformation back to a normal table.
    'lg:overflow-x-visible lg:[&_.overflow-x-auto]:overflow-x-auto',
    'lg:[&_thead]:table-header-group lg:[&_table]:table lg:[&_tbody]:table-row-group lg:[&_tr]:table-row',
    // Restore the cell top-border (BaseTable's border-style/color survive — !border-0 only zeroed the width).
    'lg:[&_tbody_td]:!border-t',
    // First cell back to a normal table cell with BaseTable's subtle padding (px-3 py-2.5).
    'lg:[&_tbody_td:first-child]:table-cell lg:[&_tbody_td:first-child]:whitespace-nowrap lg:[&_tbody_td:first-child]:!px-3 lg:[&_tbody_td:first-child]:!py-2.5',
    'lg:[&_tbody_td:not(:first-child)]:table-cell',
    // Undo the row-card chrome (padding on a table-row is ignored, so no need to reset px/py).
    'lg:[&_tbody_tr]:mb-0 lg:[&_tbody_tr]:cursor-auto lg:[&_tbody_tr]:rounded-none lg:[&_tbody_tr]:border-0 lg:[&_tbody_tr]:bg-transparent',
);

export function BaseTransactionHistoryCard({
    rows,
    fetching,
    foundOldest,
    onRefresh,
    onLoadMore,
    headerActions,
    headerSubRow,
    renderRow,
}: BaseTransactionHistoryCardProps) {
    const hasTimestamps = rows.some(row => row.blockTime);
    const isEmpty = rows.length === 0;

    return (
        <div className={TABLE_CLASSES}>
            <div className="mb-3 flex min-h-[1.75rem] items-center gap-2">
                <CardTitle as="h3" ui="dashkit" className="flex-1">
                    Transaction History
                </CardTitle>
                {headerActions}
                <RefreshButton analyticsSection="transaction_history_header" onClick={onRefresh} fetching={fetching} />
            </div>
            {headerSubRow && <div className="mb-3 flex flex-wrap gap-2">{headerSubRow}</div>}

            <Card
                ui="dashkit"
                marginBottom="none"
                className="!border-0 !bg-transparent !shadow-none lg:!border lg:!bg-dk-gray-800-dark lg:!shadow-dk-card"
            >
                <BaseTable ui="dashkit" variant="card" head="subtle" body="subtle" nowrap>
                    {!isEmpty && (
                        <BaseTable.Head>
                            <BaseTable.Row>
                                <BaseTable.HeaderCell>Transaction Signature</BaseTable.HeaderCell>
                                {hasTimestamps && (
                                    <BaseTable.HeaderCell className="w-[26%] min-w-[190px]">Time</BaseTable.HeaderCell>
                                )}
                                <BaseTable.HeaderCell className="w-[19%] min-w-[150px]">Block</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="w-[16%] min-w-[120px]">
                                    Size (bytes)
                                </BaseTable.HeaderCell>
                            </BaseTable.Row>
                        </BaseTable.Head>
                    )}
                    <BaseTable.Body>{rows.map(row => renderRow(row, hasTimestamps))}</BaseTable.Body>
                </BaseTable>
                <div
                    className={cn(
                        // Mobile: no outer card frame, so no top divider and no horizontal padding.
                        // Desktop: the footer sits inside the card, so add the top divider + padding.
                        'border-0 border-solid border-dark-border px-0 py-3 lg:px-3',
                        !isEmpty && 'lg:border-t',
                        isEmpty && 'py-12',
                    )}
                >
                    <HistoryCardFooterContent fetching={fetching} foundOldest={foundOldest} loadMore={onLoadMore} />
                </div>
            </Card>
        </div>
    );
}
