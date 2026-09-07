'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import { cn } from '@components/shared/utils';
import { useTokenInfo } from '@entities/token-info';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { displayAddress, TokenLabelInfo } from '@utils/tx';
import { useClusterPath } from '@utils/url';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import React, { useRef, useState } from 'react';

import { EditIcon, NicknameEditor, useNickname } from '@/app/features/nicknames';
import { useVisibility } from '@/app/shared/lib/visibility';

import { Copyable } from './Copyable';
import { useMidTruncation } from './useMidTruncation';

const rowVariants = cva('relative flex w-full min-w-0 items-baseline overflow-x-clip px-px', {
    defaultVariants: {
        alignRight: false,
    },
    variants: {
        alignRight: {
            false: '',
            true: 'md:justify-end',
        },
    },
});

type Props = {
    pubkey: PublicKey;
    alignRight?: boolean;
    className?: string;
    link?: boolean;
    raw?: boolean;
    noTruncate?: boolean;
    overrideText?: string;
    tokenLabelInfo?: TokenLabelInfo;
    fetchTokenLabelInfo?: boolean;
    'aria-label'?: string;
    noCopy?: boolean;
    noNicknameEditing?: boolean;
};

export function Address({
    pubkey,
    alignRight,
    link,
    raw,
    noTruncate,
    overrideText,
    tokenLabelInfo,
    className,
    fetchTokenLabelInfo,
    'aria-label': ariaLabel,
    noCopy,
    noNicknameEditing,
}: Props) {
    const address = pubkey.toBase58();
    const { cluster, genesisHash } = useCluster();
    const addressPath = useClusterPath({ pathname: `/address/${address}` });
    const [showNicknameEditor, setShowNicknameEditor] = useState(false);
    const nickname = useNickname(address);
    const { ref: visibilityRef, isVisible } = useVisibility(fetchTokenLabelInfo);

    const display = displayAddress(address, cluster, tokenLabelInfo);

    let addressLabel = raw ? address : display;

    const shouldFetchTokenInfo = fetchTokenLabelInfo && isVisible;
    const tokenInfo = useTokenInfo(shouldFetchTokenInfo, address, cluster, genesisHash);
    if (tokenInfo) {
        addressLabel = displayAddress(address, cluster, tokenInfo);
    }

    if (overrideText) {
        addressLabel = overrideText;
    }

    const displayText = nickname ? `"${nickname}" (${addressLabel})` : addressLabel;

    // Mid-truncation applies to raw 44-char addresses. When a nickname is shown the address
    // line always truncates regardless of the noTruncate prop (the nickname makes it necessary).
    const isMidTruncateCandidate = (!noTruncate || !!nickname) && !overrideText && addressLabel === address;

    const editBtnRef = useRef<HTMLButtonElement>(null);
    const { rowRef, hiddenTextRef, isMidTruncated, midTruncatedText } = useMidTruncation(
        isMidTruncateCandidate,
        address,
        editBtnRef,
    );

    const handleMouseEnter = (text: string) => {
        const elements = document.querySelectorAll(`[data-address="${text}"]`);
        elements.forEach(el => {
            (el as HTMLElement).classList.add('address-highlight');
        });
    };

    const handleMouseLeave = (text: string) => {
        const elements = document.querySelectorAll(`[data-address="${text}"]`);
        elements.forEach(el => {
            (el as HTMLElement).classList.remove('address-highlight');
        });
    };

    const visibleText = isMidTruncated ? midTruncatedText : displayText;

    const innerTextClassName = cn('font-mono', !nickname && !noTruncate && 'truncate', nickname && 'block min-w-0');

    // When a nickname is set, render it and the address label as two stacked lines
    // so neither overflows on narrow (mobile) viewports.
    const nicknameDisplay = nickname ? (
        <span className="flex min-w-0 flex-col">
            <span className="truncate font-mono">&quot;{nickname}&quot;</span>
            <span className="truncate font-mono text-muted">{isMidTruncated ? midTruncatedText : addressLabel}</span>
        </span>
    ) : undefined;

    const innerContent = link ? (
        <Link href={addressPath} className={innerTextClassName}>
            {nickname ? nicknameDisplay : visibleText}
        </Link>
    ) : (
        <span className={cn(innerTextClassName, className)}>{nickname ? nicknameDisplay : visibleText}</span>
    );

    const addressDisplay = isMidTruncateCandidate ? (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    data-address={address}
                    className="relative min-w-0 overflow-hidden font-mono"
                    onMouseEnter={() => handleMouseEnter(address)}
                    onMouseLeave={() => handleMouseLeave(address)}
                >
                    {innerContent}
                </span>
            </TooltipTrigger>
            {isMidTruncated && (
                <TooltipContent>
                    <span className="font-mono">{address}</span>
                </TooltipContent>
            )}
        </Tooltip>
    ) : (
        <span
            data-address={address}
            className="relative min-w-0 overflow-hidden font-mono"
            onMouseEnter={() => handleMouseEnter(address)}
            onMouseLeave={() => handleMouseLeave(address)}
            title={nickname ? displayText : undefined}
        >
            {innerContent}
        </span>
    );

    return (
        <span ref={visibilityRef} className="block w-full min-w-0">
            <div ref={rowRef} className={rowVariants({ alignRight: Boolean(alignRight) })} aria-label={ariaLabel}>
                {/* Hidden span for measuring the natural text width — absolutely positioned so it doesn't affect layout */}
                {isMidTruncateCandidate && (
                    <span
                        ref={hiddenTextRef}
                        className="pointer-events-none invisible absolute whitespace-nowrap font-mono"
                        aria-hidden
                    >
                        {addressLabel}
                    </span>
                )}
                {noCopy ? addressDisplay : <Copyable text={address}>{addressDisplay}</Copyable>}
                {!noNicknameEditing && (
                    <button
                        ref={editBtnRef}
                        className="ms-1.5 flex-none shrink-0 cursor-pointer border-0 bg-transparent p-0 text-muted"
                        onClick={e => {
                            e.stopPropagation();
                            setShowNicknameEditor(true);
                        }}
                        title="Edit nickname"
                        style={{ fontSize: '0.875rem', lineHeight: 1 }}
                    >
                        <EditIcon className="-mt-0.5" />
                    </button>
                )}
                {!noNicknameEditing && (
                    <NicknameEditor
                        address={address}
                        open={showNicknameEditor}
                        onClose={() => setShowNicknameEditor(false)}
                    />
                )}
            </div>
        </span>
    );
}
