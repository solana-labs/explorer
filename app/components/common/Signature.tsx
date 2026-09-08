'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import { cn } from '@components/shared/utils';
import { TransactionSignature } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';

import { Copyable } from './Copyable';
import { useMidTruncation } from './useMidTruncation';

const signatureVariants = cva('relative flex w-full min-w-0 justify-start overflow-x-hidden', {
    defaultVariants: {
        alignItems: 'center',
        alignRight: false,
    },
    variants: {
        alignItems: {
            center: 'items-center',
            start: 'items-start',
        },
        alignRight: {
            false: '',
            true: 'lg:justify-end',
        },
    },
});

type Props = {
    signature: TransactionSignature;
    alignItems?: 'center' | 'start';
    alignRight?: boolean;
    className?: string;
    link?: boolean;
    noTruncate?: boolean;
} & Omit<VariantProps<typeof signatureVariants>, 'alignItems' | 'alignRight'>;

export function Signature({ signature, alignItems, alignRight, className, link, noTruncate }: Props) {
    const transactionPath = useClusterPath({ pathname: `/tx/${signature}` });
    const { rowRef, hiddenTextRef, isMidTruncated, midTruncatedText } = useMidTruncation(!noTruncate, signature);

    const visibleText = isMidTruncated ? midTruncatedText : signature;

    return (
        <div ref={rowRef} className={cn(signatureVariants({ alignItems, alignRight: Boolean(alignRight) }), className)}>
            {!noTruncate && (
                <span
                    ref={hiddenTextRef}
                    className="pointer-events-none invisible absolute whitespace-nowrap font-mono"
                    aria-hidden
                >
                    {signature}
                </span>
            )}
            <Copyable text={signature}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="relative min-w-0 overflow-hidden font-mono">
                            {link ? (
                                <Link href={transactionPath} className="font-mono">
                                    {visibleText}
                                </Link>
                            ) : (
                                <span className="font-mono">{visibleText}</span>
                            )}
                        </span>
                    </TooltipTrigger>
                    {isMidTruncated && (
                        <TooltipContent className="max-w-[min(320px,90vw)]">
                            <span className="break-all font-mono">{signature}</span>
                        </TooltipContent>
                    )}
                </Tooltip>
            </Copyable>
        </div>
    );
}
