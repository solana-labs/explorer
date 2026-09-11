import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

const formControlVariants = cva(['block', 'w-full', 'bg-transparent', 'text-inherit'], {
    defaultVariants: { variant: 'default' },
    variants: {
        variant: {
            // Bootstrap .form-control baseline equivalent: bordered, padded, rounded.
            // No focus chrome to match production (Bootstrap's .form-control:focus set `outline: 0`).
            default:
                'rounded-lg border border-solid border-outer-space-800 px-3 py-2 focus:outline-none focus-visible:outline-none',
            // .form-control-flush: no border, no horizontal padding, no focus chrome.
            flush: 'resize-none border-0 px-0 py-2 focus:outline-none focus-visible:outline-none',
            // .form-control-flush + .form-control-auto: no border, no padding, auto height, no focus chrome.
            'flush-auto': 'min-h-0 resize-none border-0 p-0 focus:outline-none focus-visible:outline-none',
        },
    },
});

export interface FormControlProps extends VariantProps<typeof formControlVariants>, React.HTMLAttributes<HTMLElement> {
    children: React.ReactElement;
}

/**
 * Slot-style styling wrapper for form elements. Renders its single child element (input / textarea /
 * select) with form-control classes composed in. Uses Radix Slot for ref + event composition.
 *
 * Usage:
 *   <FormControl variant="flush-auto" className="font-mono">
 *     <textarea rows={3} placeholder="..." />
 *   </FormControl>
 */
const FormControl = React.forwardRef<HTMLElement, FormControlProps>(
    ({ children, className, variant, ...props }, ref) => (
        <Slot ref={ref} className={cn(formControlVariants({ variant }), className)} {...props}>
            {children}
        </Slot>
    ),
);
FormControl.displayName = 'FormControl';

export { FormControl, formControlVariants };
