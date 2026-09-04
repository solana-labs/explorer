import React from 'react';

import { cn } from '@/app/components/shared/utils';
import { BaseTable, type BaseTableProps } from '@/app/shared/ui/Table';

// dashkit `.card-table` only zeroes thead th border-top; headless card tables also need the
// first body row's border-top suppressed or the card gains a 1px rule at the top edge.
const firstRowBorderFix = '[&_tr:first-child_td]:!border-t-0';

type TableLayout = 'compact' | 'expanded';

export interface TableCardBodyProps extends React.PropsWithChildren {
    className?: string;
    density?: BaseTableProps['density'];
    layout?: TableLayout;
}

export function TableCardBody({ children, className, density, layout = 'compact' }: TableCardBodyProps) {
    return (
        <BaseTable
            ui="dashkit"
            variant="card"
            density={density}
            nowrap={layout === 'compact'}
            className={cn(firstRowBorderFix, className)}
        >
            <BaseTable.Body>{children}</BaseTable.Body>
        </BaseTable>
    );
}

export interface TableCardBodyHeadedProps extends TableCardBodyProps {
    headerComponent?: React.ReactNode;
}

export function TableCardBodyHeaded({
    children,
    className,
    density,
    headerComponent,
    layout = 'compact',
}: TableCardBodyHeadedProps) {
    return (
        <BaseTable
            ui="dashkit"
            variant="card"
            density={density}
            nowrap={layout === 'compact'}
            className={cn(firstRowBorderFix, className)}
        >
            {headerComponent ? <BaseTable.Head>{headerComponent}</BaseTable.Head> : null}
            <BaseTable.Body>{children}</BaseTable.Body>
        </BaseTable>
    );
}
