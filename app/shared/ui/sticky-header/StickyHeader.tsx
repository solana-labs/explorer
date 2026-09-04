'use client';

import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/app/components/shared/utils';

import { useStickyHeaderHeight } from './useStickyHeaderHeight';

type Props = {
    children: React.ReactNode;
    className?: string;
};

export function StickyHeader({ children, className }: Props) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [isStuck, setIsStuck] = useState(false);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        // threshold:1 fires as soon as the sentinel is no longer fully visible,
        // which is the exact moment the header becomes sticky.
        const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), { threshold: [1] });
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

    useStickyHeaderHeight(headerRef);

    return (
        <>
            <div ref={sentinelRef} aria-hidden="true" />
            <div
                ref={headerRef}
                className={cn(
                    'sticky top-0 z-10 mb-8 border-0 border-b border-solid border-neutral-800 bg-heavy-metal-900',
                    className,
                )}
                style={isStuck ? { marginLeft: 'calc(50% - 50vw)', maxWidth: 'none', width: '100vw' } : undefined}
            >
                <div className={cn(!isStuck && '-mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 xl:-mx-10 xxl:-mx-12')}>
                    {children}
                </div>
            </div>
        </>
    );
}
