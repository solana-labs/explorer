'use client';

import { RawDataField } from '@components/shared/RawDataField';
import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { DialogClose, DialogTitle } from '@components/shared/ui/dialog';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { ArrowRight, X } from 'react-feather';

import type { InstructionSummary } from '@/app/entities/transaction-data';
import { FetchStatus } from '@/app/providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { CopyButton } from '@/app/shared/ui/CopyButton';
import { Drawer } from '@/app/shared/ui/drawer';
import { displayTimestampUtc } from '@/app/utils/date';
import { useClusterPath } from '@/app/utils/url';

import { CompactKeyValue } from './CompactKeyValue';
import { InstructionList, InstructionListSkeleton } from './InstructionList';

export function TransactionDetailsDrawer({
    open,
    onOpenChange,
    signature,
    slot,
    blockTime,
    statusLabel,
    statusVariant,
    instructionNames,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    signature: string;
    slot: number;
    blockTime: number | null | undefined;
    statusLabel: string;
    statusVariant: 'success' | 'warning';
    instructionNames: InstructionSummary[] | undefined;
}) {
    const txPath = useClusterPath({ pathname: `/tx/${signature}` });
    const blockPath = useClusterPath({ pathname: `/block/${slot}` });

    const fetchRaw = useFetchRawTransaction();
    const rawDetails = useRawTransactionDetails(signature);
    const transactionData = rawDetails?.data?.raw?.messageBytes;
    const rawLoading = rawDetails?.status === FetchStatus.Fetching;
    useEffect(() => {
        if (open && !transactionData && !rawLoading) fetchRaw(signature);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const header = (
        <Drawer.Header>
            <DialogTitle className="!mt-0 text-base !text-outer-space-300">Transaction</DialogTitle>
            <div className="mt-2 flex items-end gap-4 pb-2 text-white">
                <div className="min-w-0 flex-1">
                    <span className="break-all font-mono text-xl">{signature}</span>
                    <div className="mt-1">
                        <Badge ui="dashkit" tone="soft" variant={statusVariant}>
                            {statusLabel}
                        </Badge>
                    </div>
                </div>
                <CopyButton value={signature} noun="signature" className="my-[-4px]" />
            </div>
        </Drawer.Header>
    );

    const footer = (
        <Drawer.Footer>
            <CopyButton value={signature} noun="signature" size="tile" flash className="flex-1">
                Copy
            </CopyButton>
            <Button asChild size="tile" className="flex-1" variant="accent">
                <Link href={txPath}>
                    <ArrowRight size={18} />
                    Open
                </Link>
            </Button>
            <DialogClose asChild>
                <Button className="flex-1" size="tile" variant="outline">
                    <X size={18} />
                    Close
                </Button>
            </DialogClose>
        </Drawer.Footer>
    );

    return (
        <Drawer open={open} onOpenChange={onOpenChange} header={header} footer={footer}>
            <div className="flex flex-col px-4 pb-4 text-sm">
                {blockTime && (
                    <CompactKeyValue label="Time">
                        <div className="flex flex-col">
                            <span>{displayTimestampUtc(blockTime * 1000, true)}</span>
                            <RelativeTime date={blockTime * 1000} />
                        </div>
                    </CompactKeyValue>
                )}
                <CompactKeyValue
                    label="Block"
                    trailing={
                        <CopyButton
                            value={slot.toString()}
                            noun="block number"
                            className="relative top-[1px] my-[-4px]"
                        />
                    }
                >
                    <Link href={blockPath} className="font-mono text-sm">
                        {slot.toLocaleString('en-US')}
                    </Link>
                </CompactKeyValue>
                <CompactKeyValue label="Programs">
                    <div className="min-w-0">
                        {instructionNames !== undefined && instructionNames.length > 0 ? (
                            <InstructionList instructions={instructionNames} />
                        ) : instructionNames === undefined ? (
                            <InstructionListSkeleton />
                        ) : (
                            <span className="text-outer-space-300">---</span>
                        )}
                    </div>
                </CompactKeyValue>
                {/* The raw-data field carries its own "Size" caption, so this row has no label. */}
                <div className="flex flex-col gap-2 pb-1 pt-2 text-white">
                    <RawDataField
                        data={transactionData}
                        loading={rawDetails === undefined || rawLoading}
                        filename={signature}
                        variant="embedded"
                        bytesPrefix="Size "
                    />
                </div>
            </div>
        </Drawer>
    );
}
