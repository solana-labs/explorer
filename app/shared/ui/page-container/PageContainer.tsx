import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

// Drop-in replacement for Bootstrap's `.container`. Padding mirrors dashkit's
// `$container-padding-x` (0.75rem = px-3). Width comes in two flavours:
//   - `stepped` (default): dashkit's `$container-max-widths` breakpoint steps
//     (sm 540 / md 720 / lg 960 / xl 1140).
//   - `fluid`: fills the full available width, capped at a single max-width and
//     centred once that cap is reached.
const pageContainerVariants = cva('mx-auto w-full px-3', {
    defaultVariants: { variant: 'default', width: 'stepped' },
    variants: {
        variant: {
            default: '',
            // Bootstrap `.mt-n3` — pulls the container up under the page header's bottom padding
            'pulled-up': '-mt-dk-3',
        },
        width: {
            fluid: 'max-w-[960px]',
            stepped: 'sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1140px]',
        },
    },
});

type PageContainerProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof pageContainerVariants>;

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
    ({ className, variant, width, ...props }, ref) => (
        <div ref={ref} className={cn(pageContainerVariants({ variant, width }), className)} {...props} />
    ),
);
PageContainer.displayName = 'PageContainer';

export { PageContainer };
