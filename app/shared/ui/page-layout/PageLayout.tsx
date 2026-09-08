import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// The shell of a detail page (Transaction / Block / Account): centres the content column, caps its
// width and applies the page's horizontal + top padding. It does NOT own the vertical rhythm between
// blocks — that lives in <PageSections>, so a page composes the two (see the story). Splitting them
// lets the block page keep its header outside the rhythm while the transaction page keeps it inside.
//
// Project breakpoints switch the wide values at `lg` (992px): the mobile/tablet values run through
// `md`, the desktop values begin at `lg`.
const pageLayoutVariants = cva('mx-auto flex flex-col px-4 pt-3 lg:px-6 lg:pt-5', {
    defaultVariants: { width: 'default' },
    variants: {
        // Content column max-width. `default` caps at the detail-page width; `full` spans the parent.
        width: {
            default: 'max-w-5xl',
            full: 'max-w-none',
        },
    },
});

export interface PageLayoutProps
    extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageLayoutVariants> {}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(({ className, width, ...props }, ref) => (
    <div ref={ref} className={cnPrefixed(pageLayoutVariants({ width }), className)} {...props} />
));
PageLayout.displayName = 'PageLayout';

export { PageLayout, pageLayoutVariants };
