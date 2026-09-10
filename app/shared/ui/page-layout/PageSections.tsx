import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

export const PAGE_SECTION_GAP = 'space-y-9 lg:space-y-12';

const PageSections = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cnPrefixed('flex flex-col', PAGE_SECTION_GAP, className)} {...props} />
    ),
);
PageSections.displayName = 'PageSections';

export { PageSections };
