import { cn } from '@components/shared/utils';
import { type ReactNode } from 'react';
import { HelpCircle } from 'react-feather';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';

type Props = {
    text?: string;
    children?: ReactNode;
    bottom?: boolean;
    right?: boolean;
    withHelpIcon?: boolean;
    className?: string;
};

// Split a label into everything-but-the-last-word (`lead`) and its last word so the caller can pin
// an inline icon to `lastWord` inside a `nowrap` run. `lead` keeps the trailing separator so earlier
// words still wrap normally; it is empty for a single word, making the whole label + icon one
// unbreakable run.
export function splitLastWord(label: string): { lead: string; lastWord: string } {
    // eslint-disable-next-line no-restricted-syntax -- trim trailing whitespace before locating the label's last word
    const trimmed = label.replace(/\s+$/, '');
    // eslint-disable-next-line no-restricted-syntax -- split off the last word on ANY whitespace (space/tab/NBSP) so the icon can be pinned to it
    const match = trimmed.match(/^([\s\S]*\S\s+)(\S+)$/);
    return match ? { lastWord: match[2], lead: match[1] } : { lastWord: trimmed, lead: '' };
}

export function InfoTooltip({ bottom, right, text, children, withHelpIcon = true, className }: Props) {
    if (!text) {
        return <>{children}</>;
    }

    // `bottom`/`right` props are legacy Bootstrap-popover positions; map to Radix `side`.
    const side = bottom ? 'bottom' : right ? 'right' : 'top';

    const content = (
        <TooltipContent side={side} className="max-w-80">
            {text}
        </TooltipContent>
    );

    // Without an icon, the whole children node is the hover target.
    if (!withHelpIcon) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn('inline-flex cursor-help', className)}>{children}</span>
                </TooltipTrigger>
                {content}
            </Tooltip>
        );
    }

    // The help icon (not the label) is the hover target, so the tooltip only opens over the
    // question mark. `verticalAlign` drops the 13px icon onto the ~13px text's optical center.
    const icon = (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="ml-1 inline-flex cursor-help" style={{ verticalAlign: '-2px' }}>
                    <HelpCircle size={13} />
                </span>
            </TooltipTrigger>
            {content}
        </Tooltip>
    );

    // We want the icon to sit right after the label's *last word* and wrap *with* it, not float
    // after the whole (possibly multi-line) block. An inline SVG is an atomic inline, so the
    // browser may break the line right before it; keeping the last word + icon in a single
    // `white-space: nowrap` run is the only reliable way to forbid that break (a WORD JOINER is
    // ignored across the element boundary). Earlier words still wrap on their spaces as normal.
    // Only a string child can be split this way; an arbitrary node can't, so its icon may wrap.
    if (typeof children === 'string') {
        const { lead, lastWord } = splitLastWord(children);
        return (
            <span className={className}>
                {lead}
                <span style={{ whiteSpace: 'nowrap' }}>
                    {lastWord}
                    {icon}
                </span>
            </span>
        );
    }

    // Non-string children: append the icon inline (it may wrap onto its own line if the label
    // wraps, since we can't isolate the last word of an arbitrary node).
    return (
        <span className={className}>
            {children}
            {icon}
        </span>
    );
}
