'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/app/components/shared/utils';
import {
    NavigationTabsContext,
    useTabRegistration,
} from '@/app/shared/ui/navigation-tabs/model/navigation-tabs-context';
import { type NavigationTab } from '@/app/shared/ui/navigation-tabs/model/types';
import { useTabOverflow } from '@/app/shared/ui/navigation-tabs/model/useTabOverflow';
import { useStickyHeaderHeight } from '@/app/shared/ui/sticky-header/useStickyHeaderHeight';

import { MobileMoreDropdown } from './MobileMoreDropdown';
import { TabLink } from './TabLink';

const SCROLL_OFFSET = 10;

export type BaseNavigationTabsProps = {
    activeValue?: string;
    buildHref: (path: string) => string;
    children?: React.ReactNode;
    className?: string;
    /** Hover tooltip shown on disabled tabs (e.g. the gated simulation-derived tabs before a run). */
    disabledHint?: React.ReactNode;
    onSelectChange?: (path: string) => void;
    onTabClick?: (path: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
    /**
     * Enables scroll-spy mode: active tab tracks scroll position, clicking scrolls smoothly.
     * Wraps the tab bar in a sticky full-width container with a shadow on stuck.
     * Use `wrapperClassName` to provide the background color (e.g. "bg-heavy-metal-900").
     */
    scrollSpy?: boolean;
    tabs: NavigationTab[];
    /** Applied to the sticky wrapper when `scrollSpy` is true. Use for background color. */
    wrapperClassName?: string;
};

export function BaseNavigationTabs({
    tabs,
    activeValue: activeValueProp,
    onSelectChange,
    onTabClick: onTabClickProp,
    buildHref,
    children,
    className,
    disabledHint,
    scrollSpy,
    wrapperClassName,
}: BaseNavigationTabsProps) {
    const { registeredTabs, registerTab, unregisterTab } = useTabRegistration();

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [stuck, setStuck] = useState(false);
    const [spyActive, setSpyActive] = useState(() => tabs[0]?.path ?? '');

    const staticPaths = useMemo(() => new Set(tabs.map(t => t.path)), [tabs]);
    const disabledPaths = useMemo(() => new Set(tabs.filter(t => t.disabled).map(t => t.path)), [tabs]);

    const allTabs = useMemo(
        () => [...tabs, ...registeredTabs.filter(t => !staticPaths.has(t.path))],
        [tabs, registeredTabs, staticPaths],
    );

    const { measuring, moreMeasureRef, moreTabs, tablistRef, visibleTabs } = useTabOverflow(allTabs);

    const scrollToSection = useCallback(
        (path: string) => {
            const target = document.getElementById(path);
            const headerEl = wrapperRef.current ?? tablistRef.current;
            if (!target || !headerEl) return;
            const offset = headerEl.getBoundingClientRect().height;
            let naturalTop = 0;
            let el: HTMLElement | null = target;
            while (el) {
                naturalTop += el.offsetTop;
                el = el.offsetParent as HTMLElement | null;
            }
            window.scrollTo({
                behavior: 'smooth',
                top: naturalTop - offset - SCROLL_OFFSET,
            });
        },
        [tablistRef],
    );

    const scrollSpyTabClick = useCallback(
        (path: string, e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            scrollToSection(path);
        },
        [scrollToSection],
    );

    useStickyHeaderHeight(wrapperRef, !!scrollSpy);

    useEffect(() => {
        if (!scrollSpy) return;
        const update = () => {
            const rect = wrapperRef.current?.getBoundingClientRect();
            // Stuck = the sticky bar has reached the top of the viewport (top: 0). Deriving this from the
            // bar's vertical position — rather than an IntersectionObserver with threshold 1 — keeps the
            // shadow correct even when the bar is full-bleed (100vw): a hairline of horizontal overflow
            // would otherwise drop the intersection ratio below 1 and pin `stuck` on permanently.
            if (rect) setStuck(rect.top <= 0);

            const tabHeight = rect?.height ?? tablistRef.current?.getBoundingClientRect().height ?? 0;
            // Activate when section is in the upper third of the visible content area
            const threshold = window.scrollY + tabHeight + window.innerHeight * 0.3;
            let active = tabs[0]?.path ?? '';
            for (const tab of tabs) {
                const el = document.getElementById(tab.path);
                if (el && el.getBoundingClientRect().top + window.scrollY <= threshold) {
                    active = tab.path;
                }
            }
            setSpyActive(active);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
        return () => window.removeEventListener('scroll', update);
    }, [scrollSpy, tabs, tablistRef]);

    const activeValue = scrollSpy ? spyActive : (activeValueProp ?? '');
    const onTabClick = scrollSpy ? scrollSpyTabClick : onTabClickProp;
    const handleSelectChange = scrollSpy ? scrollToSection : onSelectChange;

    const contextValue = useMemo(
        () => ({ activeValue, buildHref, onTabClick, registerTab, renderTabLink: true, staticPaths, unregisterTab }),
        [activeValue, buildHref, onTabClick, registerTab, staticPaths, unregisterTab],
    );

    const hiddenContextValue = useMemo(() => ({ ...contextValue, renderTabLink: false }), [contextValue]);

    const tabBar = (
        <NavigationTabsContext.Provider value={contextValue}>
            <div
                ref={tablistRef}
                role="tablist"
                className={cn('inline-flex w-full gap-[18px] overflow-hidden', className)}
            >
                {visibleTabs.map(tab => (
                    <TabLink
                        key={tab.path}
                        path={tab.path}
                        title={tab.title}
                        disabled={disabledPaths.has(tab.path)}
                        disabledHint={disabledHint}
                    />
                ))}

                {measuring && allTabs.length > 0 && (
                    <div ref={moreMeasureRef} aria-hidden="true">
                        <MobileMoreDropdown tabs={[]} />
                    </div>
                )}

                {moreTabs.length > 0 && (
                    <MobileMoreDropdown
                        tabs={moreTabs}
                        onSelectChange={handleSelectChange}
                        disabledPaths={disabledPaths}
                    />
                )}
            </div>

            {children && (
                <NavigationTabsContext.Provider value={hiddenContextValue}>
                    <div className="hidden">{children}</div>
                </NavigationTabsContext.Provider>
            )}
        </NavigationTabsContext.Provider>
    );

    if (scrollSpy) {
        return (
            <div
                ref={wrapperRef}
                className={cn(
                    'sticky top-0 z-10',
                    'ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]',
                    'pl-[calc(50vw-50%)] pr-[calc(50vw-50%)]',
                    'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    'transition-[box-shadow] duration-200',
                    stuck && 'shadow-[0_6px_16px_rgba(0,0,0,0.45)]',
                    wrapperClassName,
                )}
            >
                {tabBar}
            </div>
        );
    }

    return tabBar;
}
