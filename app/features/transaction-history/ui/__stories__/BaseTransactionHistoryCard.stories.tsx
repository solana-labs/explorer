import { createNextjsParameters, withCluster } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';

import { Signature } from '@/app/components/common/Signature';
import { Slot } from '@/app/components/common/Slot';
import { Badge } from '@/app/components/shared/ui/badge';
import { BaseTable } from '@/app/shared/ui/Table';

import {
    BaseTransactionHistoryCard,
    STATUS_BADGE,
    type TransactionHistoryRowView,
} from '../BaseTransactionHistoryCard';
import { InstructionList } from '../InstructionList';

const SIGNATURES = {
    failed: '5YtADoExampleHistoryCardSignaturePlaceholderForStoriesLJatMabcdefghijkmn',
    first: '2JgaFoExampleHistoryCardSignaturePlaceholderForStoriesZBbGUabcdefghijkmnop',
    third: 'dbaW9oExampleHistoryCardSignaturePlaceholderForStoriesfa3ewabcdefghijkmnopq',
};

function makeRow(
    overrides: Partial<TransactionHistoryRowView> & Pick<TransactionHistoryRowView, 'signature'>,
): TransactionHistoryRowView {
    return {
        blockTime: undefined,
        slot: 312_456_789,
        status: 'success',
        ...overrides,
    };
}

// A simplified row renderer for the story — the pure card owns the shell (external
// header + filter slot + refresh + table head + footer); the container owns the row.
// Real InstructionList keeps the programs cell representative without clipboard/download wiring.
function renderRow(row: TransactionHistoryRowView, hasTimestamps: boolean) {
    const badge = STATUS_BADGE[row.status];
    return (
        <BaseTable.Row key={row.signature}>
            <BaseTable.Cell>
                <div>
                    <div className="flex min-w-0 items-start gap-2">
                        <span className="min-w-0">
                            <Signature signature={row.signature} link />
                        </span>
                        <Badge ui="dashkit" tone="soft" variant={badge.variant} className="relative top-1">
                            {badge.label}
                        </Badge>
                    </div>
                    {/* Programs stacked under the signature (no separate Programs column). */}
                    <div className="mt-1">
                        <InstructionList instructions={[{ name: 'Transfer', programName: 'System' }]} />
                    </div>
                </div>
            </BaseTable.Cell>
            {hasTimestamps && (
                <BaseTable.Cell className="w-px text-outer-space-300">
                    {row.blockTime ? displayTimestampUtc(unixTimestampToMs(row.blockTime), true) : '---'}
                </BaseTable.Cell>
            )}
            <BaseTable.Cell className="w-px">
                <Slot slot={row.slot} link />
            </BaseTable.Cell>
            <BaseTable.Cell className="w-px">
                <span className="text-dk-gray-700">Raw</span>
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}

const meta = {
    component: BaseTransactionHistoryCard,
    decorators: [withCluster],
    parameters: createNextjsParameters(),
    tags: ['autodocs', 'test'],
    title: 'Features/TransactionHistory/TransactionHistoryCard',
} satisfies Meta<typeof BaseTransactionHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyHistory: Story = {
    args: {
        fetching: false,
        foundOldest: true,
        onLoadMore: () => {},
        onRefresh: () => {},
        renderRow,
        rows: [],
    },
};

// No block times → the Time column is omitted. Includes a failed row to exercise the badge.
export const WithSignatures: Story = {
    args: {
        fetching: false,
        foundOldest: false,
        onLoadMore: () => {},
        onRefresh: () => {},
        renderRow,
        rows: [
            makeRow({ signature: SIGNATURES.first, slot: 312_456_789 }),
            makeRow({ signature: SIGNATURES.failed, slot: 312_456_790, status: 'failed' }),
            makeRow({ signature: SIGNATURES.third, slot: 312_456_791 }),
        ],
    },
};

// At least one row with a block time → the Time column appears.
export const WithTimestamps: Story = {
    args: {
        fetching: false,
        foundOldest: false,
        onLoadMore: () => {},
        onRefresh: () => {},
        renderRow,
        rows: [
            makeRow({ blockTime: 1_718_000_000, signature: SIGNATURES.first, slot: 312_456_789 }),
            makeRow({ blockTime: 1_718_000_500, signature: SIGNATURES.third, slot: 312_456_790 }),
        ],
    },
};

export const Fetching: Story = {
    args: {
        fetching: true,
        foundOldest: false,
        onLoadMore: () => {},
        onRefresh: () => {},
        renderRow,
        rows: [makeRow({ signature: SIGNATURES.first })],
    },
};
