import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

// Two axes: `variant` is the semantic colour; `appearance` is `filled` (solid) or `outlined`
// (transparent/tinted). Colours are wired per pair via compoundVariants below.
// Base keeps `mb-6`; callers managing their own spacing pass `!mb-0`.
const alertVariants = cva(['relative', 'mb-6', 'rounded-dk', 'border', 'border-solid', 'px-4', 'py-3', 'text-sm'], {
    compoundVariants: [
        { appearance: 'filled', class: 'border-dk-danger bg-dk-danger text-dk-white', variant: 'danger' },
        { appearance: 'filled', class: 'border-transparent', variant: 'default' },
        { appearance: 'filled', class: 'border-dk-info bg-dk-info text-dk-white', variant: 'info' },
        { appearance: 'filled', class: 'border-[red] bg-[red] text-dk-white', variant: 'scam' },
        {
            appearance: 'filled',
            class: 'border-dk-success-on-dark bg-dk-success-on-dark text-dk-gray-900',
            variant: 'success',
        },
        {
            appearance: 'filled',
            class: 'border-dk-warning-on-dark bg-dk-warning-on-dark text-dk-white',
            variant: 'warning',
        },
        { appearance: 'outlined', class: 'border-dk-danger text-dk-danger', variant: 'danger' },
        { appearance: 'outlined', class: 'border-outer-space-800', variant: 'default' },
        {
            appearance: 'outlined',
            class: cn(
                'border-blue-500/25 bg-blue-500/10 text-blue-100 [&_.alert-icon]:text-blue-300',
                '[&_a]:text-blue-300 [&_a]:underline hover:[&_a]:text-blue-200',
            ),
            variant: 'info',
        },
        { appearance: 'outlined', class: 'border-[red] text-[red]', variant: 'scam' },
        { appearance: 'outlined', class: 'border-dk-success-on-dark text-dk-success-on-dark', variant: 'success' },
        {
            appearance: 'outlined',
            class: cn(
                'border-dk-warning-on-dark/25 bg-dk-warning-on-dark/10 text-destructive-200 [&_.alert-icon]:text-dk-warning-on-dark',
                '[&_a]:text-destructive-300 [&_a]:underline hover:[&_a]:text-destructive-200',
            ),
            variant: 'warning',
        },
    ],
    defaultVariants: { appearance: 'filled', variant: 'default' },
    variants: {
        // Every colour (and the outlined background) comes from the compoundVariants above.
        appearance: { filled: '', outlined: '' },
        variant: { danger: '', default: '', info: '', scam: '', success: '', warning: '' },
    },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
    /** Optional leading icon rendered to the left of the content (e.g. a react-feather glyph). */
    icon?: React.ReactNode;
}

// Urgent variants get role="alert" (assertive live region); polite ones get role="status"; default has no role.
const roleByVariant: Record<NonNullable<AlertProps['variant']>, 'alert' | 'status' | undefined> = {
    danger: 'alert',
    default: undefined,
    info: 'status',
    scam: 'alert',
    success: 'status',
    warning: 'alert',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ appearance, className, icon, variant, children, ...props }, ref) => (
        <div
            ref={ref}
            role={roleByVariant[variant ?? 'default']}
            className={cn(alertVariants({ appearance, variant }), className)}
            {...props}
        >
            {icon != undefined ? (
                <div className="flex items-start gap-2.5">
                    <span className="alert-icon mt-[2px] flex shrink-0 items-center" aria-hidden="true">
                        {icon}
                    </span>
                    <div className="min-w-0 flex-1">{children}</div>
                </div>
            ) : (
                children
            )}
        </div>
    ),
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };
