import React, { ReactNode } from 'react';

import { cn } from '@/app/components/shared/utils';

/** Inline code token styled for dark cards. */
export function InlineCode({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <code
            className={cn(
                'rounded bg-heavy-metal-900 px-1.5 py-0.5 font-mono text-xs text-neutral-200 [overflow-wrap:anywhere]',
                className,
            )}
        >
            {children}
        </code>
    );
}
