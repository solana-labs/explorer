import { Address } from '@components/common/Address';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import {
    type BlockData,
    getBlockTransactionAccounts,
    getBlockTransactionInstructions,
    isBlockTransaction,
    isBlockTransactionAccountWritable,
} from '@entities/block-data';
import type { Address as KitAddress } from '@solana/kit';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';

import {
    CountWithPercent,
    GridHeaderRow,
    LoadMoreButton,
    percentOf,
    type ResponsiveCell,
    ResponsiveGridRow,
    TIGHT_CARD,
} from '@/app/components/block/shared';
import { invariant } from '@/app/shared/lib/invariant';
import { Card } from '@/app/shared/ui/Card';

type AccountStats = {
    reads: number;
    writes: number;
};

const PAGE_SIZE = 25;

// Account takes the slack; the numeric columns are capped. The last column pairs Total with its % of
// transactions in one wider track. Header + rows share this template so columns stay aligned. Inline
// (not a `grid-cols-[…]` class) so the Storybook JIT can't purge it.
const ACCOUNTS_GRID: React.CSSProperties = {
    gridTemplateColumns: 'minmax(0,1fr) repeat(2, minmax(auto,5rem)) minmax(auto,8.5rem)',
};

export function BlockAccountsCard({ block, blockSlot }: { block: BlockData; blockSlot: number }) {
    const [numDisplayed, setNumDisplayed] = React.useState(10);
    const totalTransactions = block.transactions.length;

    const accountStats = React.useMemo(() => {
        const statsMap = new Map<KitAddress, AccountStats>();
        block.transactions.forEach(tx => {
            if (!isBlockTransaction(tx)) return;
            const txSet = new Map<KitAddress, boolean>();
            const accountKeys = getBlockTransactionAccounts(tx);
            getBlockTransactionInstructions(tx.message).forEach(ix => {
                ix.accountIndices.forEach(index => {
                    const accountKey = accountKeys[index];
                    invariant(accountKey, `account key index ${index} out of range`);
                    txSet.set(accountKey, isBlockTransactionAccountWritable(tx, index));
                });
            });

            txSet.forEach((isWritable, address) => {
                const stats = statsMap.get(address) || { reads: 0, writes: 0 };
                if (isWritable) {
                    stats.writes++;
                } else {
                    stats.reads++;
                }
                statsMap.set(address, stats);
            });
        });

        const accountEntries: [KitAddress, AccountStats][] = [];
        statsMap.forEach((value, key) => {
            accountEntries.push([key, value]);
        });

        accountEntries.sort((a, b) => {
            const aCount = a[1].reads + a[1].writes;
            const bCount = b[1].reads + b[1].writes;
            if (aCount < bCount) return 1;
            if (aCount > bCount) return -1;
            return 0;
        });

        return accountEntries;
    }, [block]);

    const visible = accountStats.slice(0, numDisplayed);
    const hasMore = accountStats.length > numDisplayed;

    // Header "Total" carries its % in the cells, not the header, but gets an info icon explaining it.
    const totalHelp = `Share of the block's ${totalTransactions.toLocaleString('en-US')} processed transactions that used this account.`;
    const headers: { label: string; help?: string }[] = [
        { label: 'Account' },
        { label: 'Read-Write' },
        { label: 'Read-Only' },
        { help: totalHelp, label: 'Total' },
    ];

    return (
        <CollapsibleSection title="Block Account Usage" className="">
            <Card variant="tight" className={TIGHT_CARD}>
                <div className="text-sm text-white">
                    <GridHeaderRow headers={headers} style={ACCOUNTS_GRID} rightAlignFrom={1} />

                    {visible.map(([address, stats]) => (
                        <AccountsGridRow
                            address={address}
                            blockSlot={blockSlot}
                            key={address}
                            reads={stats.reads}
                            totalTransactions={totalTransactions}
                            writes={stats.writes}
                        />
                    ))}

                    {hasMore && <LoadMoreButton onClick={() => setNumDisplayed(displayed => displayed + PAGE_SIZE)} />}
                </div>
            </Card>
        </CollapsibleSection>
    );
}

function AccountsGridRow({
    address,
    blockSlot,
    writes,
    reads,
    totalTransactions,
}: {
    address: KitAddress;
    blockSlot: number;
    writes: number;
    reads: number;
    totalTransactions: number;
}) {
    const accountPath = useClusterPath({
        additionalParams: new URLSearchParams(`accountFilter=${address}&filter=all`),
        pathname: `/block/${blockSlot}`,
    });
    const total = writes + reads;
    const totalPct = percentOf(total, totalTransactions);
    const accountLink = (
        <Link href={accountPath} className="block min-w-0">
            <Address address={address} />
        </Link>
    );
    const cells: ResponsiveCell[] = [
        { children: accountLink, desktopClassName: 'min-w-0', key: 'account', label: 'Account' },
        { children: `${writes}`, desktopClassName: 'text-right', key: 'writes', label: 'Read-Write' },
        { children: `${reads}`, desktopClassName: 'text-right', key: 'reads', label: 'Read-Only' },
        {
            children: <CountWithPercent count={total} percent={totalPct} />,
            desktopClassName: 'text-right tabular-nums',
            key: 'total',
            label: 'Total',
        },
    ];
    return <ResponsiveGridRow cells={cells} gridStyle={ACCOUNTS_GRID} />;
}
