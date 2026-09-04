import { TableCardBody, type TableCardBodyProps } from '@components/common/TableCardBody';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Card, CardHeader, CardTitle } from '@/app/shared/ui/Card';

export type BaseAccountCardProps = TableCardBodyProps & {
    title: React.ReactNode;
    rawContent?: React.ReactNode;
    headerActions?: React.ReactNode;
    refresh?: () => void;
    analyticsSection?: string;
    showRawButton?: boolean;
    /** Renders the title + actions as a section header above the card (on the page
     * background) instead of inside the card's CardHeader — the Overview card's treatment. */
    headerOutside?: boolean;
    /** Set when `children` are div-based `KeyValue` rows rather than `<tr>` table rows. Div rows are
     * invalid inside a `<table>` body, so they render directly in the card's flex column instead of
     * being wrapped in `TableCardBody`. The Raw view is always `KeyValue`, so it renders as a list
     * regardless of this flag. */
    listBody?: boolean;
};

export function BaseAccountCard({
    title,
    rawContent,
    headerActions,
    refresh,
    analyticsSection,
    showRawButton = true,
    headerOutside = false,
    listBody = false,
    children,
    ...tableProps
}: BaseAccountCardProps) {
    const [showRaw, setShowRaw] = React.useState(false);

    const header = (
        <>
            <CardTitle as="h3" ui="dashkit" className="flex flex-1 items-center gap-2">
                {title}
            </CardTitle>
            {refresh && analyticsSection && <RefreshButton analyticsSection={analyticsSection} onClick={refresh} />}
            {showRawButton && (
                <Button
                    variant={showRaw ? 'default' : 'outline'}
                    size="sm"
                    aria-label="Raw"
                    className={showRaw ? 'shadow-active-sm' : undefined}
                    onClick={() => setShowRaw(r => !r)}
                >
                    <Code size={12} />
                    <span className="hidden md:inline">Raw</span>
                </Button>
            )}
            {headerActions}
        </>
    );

    // Raw rows and `listBody` cards are div-based `KeyValue` rows, which are invalid markup inside a
    // `<table>` body; render them straight into the flex column (the `SectionCard` treatment). Only
    // `<tr>`-based cards go through `TableCardBody`'s `<table>`.
    const bodyContent = showRaw ? (
        rawContent
    ) : listBody ? (
        children
    ) : (
        <TableCardBody {...tableProps}>{children}</TableCardBody>
    );

    // `overflow-x-clip` + `min-w-0` keep every row's content bounded to the card: a value that
    // can't wrap (long address/label/raw data) is clipped at the block edge instead of spilling
    // past the rounded border. `clip` (not `hidden`) leaves the y-axis visible, so nothing turns
    // into a scroll container. Portaled popovers (tooltips, download dropdown, nickname modal)
    // render outside this box, unaffected.
    const body = <div className="flex min-w-0 flex-col overflow-x-clip">{bodyContent}</div>;

    if (headerOutside) {
        return (
            <>
                <div className="mb-3 flex items-center gap-2">{header}</div>
                <Card ui="dashkit">{body}</Card>
            </>
        );
    }

    return (
        <Card ui="dashkit">
            <CardHeader ui="dashkit" className="gap-2">
                {header}
            </CardHeader>
            {body}
        </Card>
    );
}
