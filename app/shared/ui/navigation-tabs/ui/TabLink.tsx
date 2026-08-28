'use client';

import Link from 'next/link';
import React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';
import { cn } from '@/app/components/shared/utils';
import { useNavigationTabsContext } from '@/app/shared/ui/navigation-tabs/model/navigation-tabs-context';

export const tabLinkClassName = cn(
    'appearance-none border-solid shadow-none outline-none',
    'border-b border-transparent data-[state=active]:border-b-accent',
    'bg-transparent',
    'px-0 py-4',
    'shrink-0 whitespace-nowrap',
    'text-sm font-normal text-outer-space-200 data-[state=active]:text-white',
    'no-underline',
);

export function TabLink({
    path,
    title,
    className,
    disabled,
    disabledHint,
}: {
    path: string;
    title: string;
    className?: string;
    disabled?: boolean;
    // Tooltip shown on hover over a disabled tab (e.g. "run a simulation to load this tab").
    disabledHint?: React.ReactNode;
}) {
    const ctx = useNavigationTabsContext();
    const isActive = path === ctx.activeValue;

    if (disabled) {
        const span = (
            <span
                role="tab"
                aria-disabled="true"
                data-state="inactive"
                className={cn(tabLinkClassName, 'cursor-not-allowed text-outer-space-500 opacity-60', className)}
            >
                {title}
            </span>
        );
        if (!disabledHint) return span;
        return (
            <Tooltip>
                <TooltipTrigger asChild>{span}</TooltipTrigger>
                <TooltipContent side="bottom">{disabledHint}</TooltipContent>
            </Tooltip>
        );
    }

    const { onTabClick } = ctx;
    const handleClick = onTabClick
        ? (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              onTabClick(path, e);
          }
        : undefined;
    return (
        <Link
            href={ctx.buildHref(path)}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? 'active' : 'inactive'}
            className={cn(tabLinkClassName, className)}
            onClick={handleClick}
        >
            {title}
        </Link>
    );
}
