import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

// Drop-in replacement for Bootstrap's `.container`. Padding is the generous
// responsive scale used by the redesign (px-4 up to xxl:px-12). Width comes in
// three flavours:
//   - `default` (default): wide single cap at 1400px, centred once reached.
//   - `stepped`: dashkit's `$container-max-widths` breakpoint steps
//     (sm 540 / md 720 / lg 960 / xl 1140).
//   - `fluid`: fills the available width, capped at a single max-width.
const pageContainerVariants = cva('mx-auto w-full px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 xxl:px-12', {
    defaultVariants: { variant: 'default', width: 'default' },
    variants: {
        variant: {
            default: '',
            // Bootstrap `.mt-n3` — pulls the container up under the page header's bottom padding
            'pulled-up': '-mt-dk-3',
        },
        width: {
            default: 'max-w-[1400px]',
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
