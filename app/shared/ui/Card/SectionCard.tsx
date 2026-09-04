import React from 'react';

import { Card, CardTitle } from '@/app/shared/ui/Card';

/**
 * Presentational counterpart to BaseAccountCard for program-account tab cards: the title (and any
 * header actions) sit on the page background above the card; the body is one `overflow-x-clip`
 * column so unwrappable values (address, hash, command) are clipped at the block edge. Drops the
 * Raw toggle and refresh/download chrome that only a full Account needs.
 */
export function SectionCard({
    title,
    headerActions,
    note,
    noCardMargin,
    children,
}: {
    title: React.ReactNode;
    /** Rendered to the right of the title in the outside header (e.g. a badge or Download button). */
    headerActions?: React.ReactNode;
    /** Standalone note (e.g. an `Alert`) rendered between the outside header and the card. */
    note?: React.ReactNode;
    /** Drop the Card's built-in `mb-6` so the caller controls the gap below the card. */
    noCardMargin?: boolean;
    children: React.ReactNode;
}) {
    return (
        <>
            {/* min-h matches the Transaction History card's header so the gap to the card lines up across tabs. */}
            <div className="mb-3 flex min-h-[1.75rem] items-center gap-2">
                <CardTitle as="h3" ui="dashkit" className="flex flex-1 items-center gap-2">
                    {title}
                </CardTitle>
                {headerActions}
            </div>
            {note && <div className="mb-3">{note}</div>}
            <Card ui="dashkit" className={noCardMargin ? '!mb-0' : undefined}>
                <div className="flex min-w-0 flex-col overflow-x-clip">{children}</div>
            </Card>
        </>
    );
}
