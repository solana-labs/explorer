import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// The vertical rhythm between a detail page's blocks — the single value the design system is built
// around, so a page never re-types it.
export const PAGE_SECTION_GAP = 'space-y-9 lg:space-y-12';

// A vertical stack of a detail page's blocks with the standard between-blocks rhythm. Pair it with
// <PageLayout>: put it inside the shell and drop the page's blocks in. A page keeps its header inside
// the stack (transaction page — the header participates in the rhythm) or above it (block page — the
// header owns its own gap), depending on the <PageHeader spacing> it uses.
const PageSections = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cnPrefixed('flex flex-col', PAGE_SECTION_GAP, className)} {...props} />
    ),
);
PageSections.displayName = 'PageSections';

export { PageSections };
