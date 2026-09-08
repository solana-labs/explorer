import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// The eyebrow + title header of a detail page. The typography and eyebrow → title gap are constant
// (the design-system part); `spacing` picks how the header sits relative to the page's block rhythm:
//
// - `inline` (transaction page): the header is the first child of <PageLayout gap="default">, so it
//   participates in the between-blocks rhythm. The negative bottom margin (`-mb-6`, reset to `mb-0`
//   from `lg`) offsets part of that gap so the block below sits close under the title. It's paired
//   with the layout gap on purpose — keep the two together when adjusting page spacing.
// - `standalone` (block page): the header sits outside the rhythm, directly under
//   <PageLayout gap="none">, and owns its own vertical padding + bottom gap to the first section.
const pageHeaderVariants = cva('flex flex-col gap-1.5', {
    defaultVariants: { spacing: 'inline' },
    variants: {
        spacing: {
            inline: '-mb-6 pb-3 pt-2 lg:mb-0',
            standalone: 'mb-3 py-6',
        },
    },
});

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
    extends
        Omit<React.HTMLAttributes<HTMLElement>, 'title'>,
        VariantProps<typeof pageHeaderVariants>,
        VariantProps<typeof pageTitleVariants> {
    /** Small uppercased label above the title (e.g. "Details"). Omitted when not provided. */
    eyebrow?: React.ReactNode;
    /** The page title, rendered as the page's single `<h1>`. */
    title: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
    ({ children, className, eyebrow, size, spacing, title, ...props }, ref) => (
        <header ref={ref} className={cnPrefixed(pageHeaderVariants({ spacing }), className)} {...props}>
            {eyebrow != undefined && eyebrow !== false && (
                <span className="text-xs font-normal uppercase text-muted">{eyebrow}</span>
            )}
            <h1 className={pageTitleVariants({ size })}>{title}</h1>
            {children}
        </header>
    ),
);
PageHeader.displayName = 'PageHeader';

export { PageHeader, pageHeaderVariants, pageTitleVariants };
