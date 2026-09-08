'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import Link from 'next/link';
import { ChevronDown } from 'react-feather';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { cn } from '@/app/components/shared/utils';
import { useNavigationTabsContext } from '@/app/shared/ui/navigation-tabs/model/navigation-tabs-context';
import { type NavigationTab } from '@/app/shared/ui/navigation-tabs/model/types';

import { tabLinkClassName } from './TabLink';

type MobileMoreDropdownProps = {
    disabledPaths?: Set<string>;
    onSelectChange?: (path: string) => void;
    tabs: NavigationTab[];
};

export function MobileMoreDropdown({ tabs, onSelectChange, disabledPaths }: MobileMoreDropdownProps) {
    const ctx = useNavigationTabsContext();
    const isActive = tabs.some(t => t.path === ctx.activeValue);

    return (
        <Popover>
            <div className="ml-auto flex items-center">
                <div className="mr-3 h-3/5 border-0 border-l border-solid border-neutral-700" />
                <PopoverTrigger
                    data-state={isActive ? 'active' : 'inactive'}
                    className={cn(tabLinkClassName, 'inline-flex cursor-pointer items-center gap-1')}
                >
                    More <ChevronDown size={12} />
                </PopoverTrigger>
            </div>
            <PopoverContent align="start" className="w-auto min-w-[8rem] p-1">
                {tabs.map(tab => {
                    const isDisabled = disabledPaths?.has(tab.path) ?? tab.disabled ?? false;
                    if (isDisabled) {
                        return (
                            <span
                                key={tab.path}
                                aria-disabled="true"
                                className="block cursor-not-allowed rounded px-3 py-2 text-sm text-outer-space-500 no-underline opacity-60"
                            >
                                {tab.title}
                            </span>
                        );
                    }
                    return (
                        <PopoverPrimitive.Close key={tab.path} asChild>
                            <Link
                                href={ctx.buildHref(tab.path)}
                                scroll={false}
                                onClick={() => onSelectChange?.(tab.path)}
                                data-state={tab.path === ctx.activeValue ? 'active' : 'inactive'}
                                className={cn(
                                    'block rounded px-3 py-2',
                                    'text-sm no-underline',
                                    'text-outer-space-200 data-[state=active]:text-accent',
                                    'hover:bg-outer-space-800 hover:text-white',
                                )}
                            >
                                {tab.title}
                            </Link>
                        </PopoverPrimitive.Close>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}
