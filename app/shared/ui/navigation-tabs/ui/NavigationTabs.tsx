'use client';

import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import React from 'react';

import { type NavigationTab } from '@/app/shared/ui/navigation-tabs/model/types';

import { BaseNavigationTabs } from './BaseNavigationTabs';

type NavigationTabsProps = {
    buildHref: (path: string) => string;
    children?: React.ReactNode;
    className?: string;
    /** Pin the tab bar to the top with a shadow on stuck (see BaseNavigationTabs `sticky`). */
    sticky?: boolean;
    tabs: NavigationTab[];
    /** Applied to the sticky wrapper. Use for background color. */
    wrapperClassName?: string;
};

export function NavigationTabs({
    buildHref,
    tabs,
    children,
    className,
    sticky,
    wrapperClassName,
}: NavigationTabsProps) {
    const segment = useSelectedLayoutSegment();
    const activeValue = segment ?? '';
    const router = useRouter();

    const onSelectChange = React.useCallback(
        (path: string) => {
            router.push(buildHref(path), { scroll: false });
        },
        [router, buildHref],
    );

    return (
        <BaseNavigationTabs
            tabs={tabs}
            activeValue={activeValue}
            onSelectChange={onSelectChange}
            buildHref={buildHref}
            className={className}
            sticky={sticky}
            wrapperClassName={wrapperClassName}
        >
            {children}
        </BaseNavigationTabs>
    );
}
