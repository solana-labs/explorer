'use client';

import { Button, type ButtonProps } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { type ReactNode } from 'react';
import { CheckCircle, Copy } from 'react-feather';

import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

/**
 * The single copy control: copies `value` and flips the icon to a check for ~1s. Icon-only by default;
 * pass `children` for a labeled button (e.g. a footer action tile). `flash` adds a one-shot green blink
 * on success (used by the labeled tiles).
 */
export function CopyButton({
    value,
    noun,
    children,
    className,
    disabled,
    variant = 'outline',
    size = 'sm',
    flash = false,
}: {
    value: string;
    /** What is being copied, e.g. "signature" → "Copy signature" / "Copied signature". */
    noun?: string;
    /** Optional label rendered after the icon; turns the icon-only button into a labeled one. */
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    flash?: boolean;
}) {
    const [state, copy] = useCopyToClipboard();
    const copied = state === 'copied';
    const suffix = noun ? ` ${noun}` : '';
    return (
        <Button
            variant={variant}
            size={size}
            className={cn(
                // Icon-only outline buttons use the darker outer-space border; a labeled tile keeps the
                // plain outline border so it matches sibling action tiles (Nickname / Open / Close).
                variant === 'outline' && !children && 'border-outer-space-800',
                flash && copied && 'animate-copy-flash',
                className,
            )}
            // With a visible label the text is the accessible name; only icon-only buttons need aria-label.
            aria-label={children ? undefined : `${copied ? 'Copied' : 'Copy'}${suffix}`}
            disabled={disabled}
            onClick={() => copy(value)}
        >
            {copied ? <CheckCircle size={12} className="text-dk-info" /> : <Copy size={12} />}
            {children}
        </Button>
    );
}
