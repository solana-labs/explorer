'use client';

import { RawDataField } from '@components/shared/RawDataField';
import { Button } from '@components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { Code, RefreshCw } from 'react-feather';

import type { ByteArray } from '@/app/shared/lib/bytes';

export type RawDataSizeFieldProps = {
    /** Payload size in bytes. `undefined` renders a placeholder (info unavailable). */
    size: number | undefined;
    /** Raw bytes shown in the popover (only relevant when `size > 0`). */
    data: ByteArray | undefined;
    filename: string;
    loading?: boolean;
    /** When set, the size fetch failed after exhausting its retries; render a manual retry control. */
    onRetry?: () => void;
    /** Extra classes for the popover trigger button (e.g. vertical alignment in a table cell). */
    buttonClassName?: string;
};

export function RawDataSizeField({ size, data, filename, loading, onRetry, buttonClassName }: RawDataSizeFieldProps) {
    if (loading) {
        return <Skeleton className="tx-size-skeleton my-1 h-3.5 w-16" />;
    }

    if (size === undefined) {
        // Fetch failed for good — offer a retry instead of a dead `-`. Otherwise the size is genuinely
        // unavailable (nothing to fetch), so keep the static placeholder.
        if (onRetry) {
            return (
                <Button
                    variant="ghost"
                    className={cn('!px-0 text-outer-space-300', buttonClassName)}
                    onClick={onRetry}
                    aria-label="Retry loading size"
                >
                    <RefreshCw size={14} />
                    <span>Retry</span>
                </Button>
            );
        }
        return <span className="text-outer-space-300">-</span>;
    }

    if (size > 0) {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className={cn('!px-0', buttonClassName)}>
                        <Code size={14} />
                        <span>{size.toLocaleString('en-US')}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto !rounded-lg border-none p-0" align="end">
                    <RawDataField data={data} filename={filename} />
                </PopoverContent>
            </Popover>
        );
    }

    return <span>{size.toLocaleString('en-US')}</span>;
}
