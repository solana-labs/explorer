import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// The eyebrow + title header of a detail page (Transaction / Block / Inspector). It sits above the
// page's <PageSections> block rhythm as a direct child of <PageLayout>, owning its own vertical
// padding (`py-6`) and the gap down to the first section (`mb-3`). The typography and the
// eyebrow → title gap are constant across every page — that's the design-system part.
const pageHeaderClassName = 'mb-3 flex flex-col gap-1.5 py-6';

// The title font scales up one step from `md`, matching the transaction page.
const pageTitleVariants = cva('m-0 font-normal leading-none text-white', {
    defaultVariants: { size: 'default' },
    variants: {
        size: {
            default: 'text-2xl md:text-3xl',
            sm: 'text-xl md:text-2xl',
        },
    },
});

export interface PageHeaderProps
    extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>, VariantProps<typeof pageTitleVariants> {
    /** Small uppercased label above the title (e.g. "Details"). Omitted when not provided. */
    eyebrow?: React.ReactNode;
    /** The page title, rendered as the page's single `<h1>`. */
    title: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
    ({ children, className, eyebrow, size, title, ...props }, ref) => (
        <header ref={ref} className={cnPrefixed(pageHeaderClassName, className)} {...props}>
            {eyebrow != undefined && eyebrow !== false && (
                <span className="text-xs font-normal uppercase text-muted">{eyebrow}</span>
            )}
            <h1 className={pageTitleVariants({ size })}>{title}</h1>
            {children}
        </header>
    ),
);
PageHeader.displayName = 'PageHeader';

export { PageHeader, pageTitleVariants };
