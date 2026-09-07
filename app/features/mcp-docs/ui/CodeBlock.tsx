'use client';

import { Check, Copy, XCircle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

/**
 * Multiline code snippet with a copy affordance (`Copyable` is inline-only, hence a dedicated block).
 * `flush` drops the own border/rounding for use as a full-bleed segment inside a card.
 *
 * `wrap` soft-wraps long lines — right for prose-like snippets. The default keeps lines intact and
 * scrolls horizontally instead, so structured code (JSON, commands) doesn't break mid-token on mobile.
 */
export function CodeBlock({
    code,
    className,
    variant = 'panel',
    wrap = false,
}: {
    code: string;
    className?: string;
    variant?: 'panel' | 'flush';
    wrap?: boolean;
}) {
    const [state, copy] = useCopyToClipboard(1000);

    const icon = {
        copied: <Check size={14} aria-hidden />,
        copy: <Copy size={14} aria-hidden />,
        errored: <XCircle size={14} aria-hidden />,
    }[state];

    return (
        <div
            className={cn(
                'relative bg-heavy-metal-900',
                variant === 'panel' && 'rounded-lg border border-solid border-white/10',
                className,
            )}
        >
            <button
                type="button"
                aria-label="Copy to clipboard"
                onClick={() => copy(code)}
                className={cn(
                    // `flex` collapses the svg's inline line box, keeping the button square.
                    'absolute right-3 top-3 flex cursor-pointer rounded border-0 bg-transparent p-1.5',
                    'text-neutral-500 hover:bg-heavy-metal-800 hover:text-neutral-200',
                    state === 'copied' && 'text-dark-accent hover:text-dark-accent',
                    state === 'errored' && 'text-red-500 hover:text-red-500',
                )}
            >
                {icon}
            </button>
            <pre
                className={cn(
                    'm-0 font-mono text-xs leading-relaxed text-neutral-200',
                    wrap
                        ? 'whitespace-pre-wrap [overflow-wrap:anywhere]'
                        : 'overflow-x-auto whitespace-pre [scrollbar-width:thin]',
                    // Flush segments sit inside a p-6 card section — match its padding.
                    variant === 'flush' ? 'p-4 pr-10 sm:p-6 sm:pr-10' : 'p-4 pr-10',
                )}
            >
                {code}
            </pre>
        </div>
    );
}
