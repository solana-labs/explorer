import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

const pageHeaderClassName = 'mb-3 flex flex-col gap-1.5 py-6';

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
