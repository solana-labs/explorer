import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// `ui` picks the visual lineage. Default is "tw" since most consumers already use Tailwind — pass ui="dashkit" explicitly when migrating Bootstrap `.card*` callsites; the "dashkit" branch + dk-* tokens get deleted once migration completes.
type UI = 'dashkit' | 'tw';

const cardVariants = cva(['relative flex min-w-0 flex-col break-words'], {
    compoundVariants: [
        { class: 'px-6 py-2.5', ui: 'tw', variant: 'default' },
        { class: 'px-3 py-2', ui: 'tw', variant: 'narrow' },
        { class: '', ui: 'tw', variant: 'tight' },
    ],
    defaultVariants: { flex: 'default', ui: 'tw', variant: 'default' },
    variants: {
        flex: {
            default: '',
            grow: 'flex-1',
        },
        // Override the implicit margin-bottom that `ui="dashkit"` ships with.
        marginBottom: {
            none: 'mb-0',
            sm: 'mb-2',
        },
        ui: {
            dashkit: 'mb-6 rounded-lg border border-solid border-outer-space-800 bg-dk-gray-800-dark shadow-dk-card',
            tw: 'rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 text-neutral-200',
        },
        // Card-level padding; only meaningful when ui="tw" (matches the legacy OKLCH Card's `variant` prop).
        // For ui="dashkit", padding lives on <BaseCardBody> per dashkit's `.card-body` convention.
        variant: {
            default: '',
            narrow: '',
            tight: '',
        },
    },
});

export interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const BaseCard = React.forwardRef<HTMLDivElement, BaseCardProps>(
    ({ className, flex, marginBottom, ui, variant, ...props }, ref) => (
        <div
            ref={ref}
            className={cnPrefixed(cardVariants({ flex, marginBottom, ui, variant }), className)}
            {...props}
        />
    ),
);
BaseCard.displayName = 'BaseCard';

const headerVariants = cva([], {
    defaultVariants: { ui: 'tw' },
    variants: {
        ui: {
            dashkit:
                'flex h-[60px] items-center border-0 border-b border-solid border-dark-border px-dk-4 py-3 [&>:first-child]:flex-1',
            tw: 'flex flex-col space-y-1.5 p-6',
        },
    },
});

interface UIPropOverride {
    ui?: UI;
}

const BaseCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & UIPropOverride>(
    ({ className, ui, ...props }, ref) => (
        <div ref={ref} className={cnPrefixed(headerVariants({ ui }), className)} {...props} />
    ),
);
BaseCardHeader.displayName = 'BaseCardHeader';

const bodyVariants = cva([], {
    defaultVariants: { ui: 'tw' },
    variants: {
        ui: {
            dashkit: 'flex-auto p-6',
            tw: 'p-6 pt-0',
        },
    },
});

const BaseCardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & UIPropOverride>(
    ({ className, ui, ...props }, ref) => (
        <div ref={ref} className={cnPrefixed(bodyVariants({ ui }), className)} {...props} />
    ),
);
BaseCardBody.displayName = 'BaseCardBody';

const footerVariants = cva([], {
    defaultVariants: { ui: 'tw' },
    variants: {
        ui: {
            dashkit: 'border-0 border-t border-solid border-dark-border rounded-b-[7px] px-dk-4 py-4',
            tw: 'flex items-center p-6 pt-0',
        },
    },
});

const BaseCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & UIPropOverride>(
    ({ className, ui, ...props }, ref) => (
        <div ref={ref} className={cnPrefixed(footerVariants({ ui }), className)} {...props} />
    ),
);
BaseCardFooter.displayName = 'BaseCardFooter';

const titleVariants = cva([], {
    defaultVariants: { ui: 'tw' },
    variants: {
        ui: {
            // Size token is appended separately so polymorphic `as` matches the original heading level.
            // line-height 1.1 mirrors dashkit's compiled h1..h3 rule; `leading-none` (1) clipped the
            // rendered height by ~10% and cascaded shift into body/footer below the title.
            dashkit: 'm-0 font-medium leading-[1.1] tracking-[-0.02em]',
            tw: 'text-sm font-medium leading-none tracking-tight',
        },
    },
});

type CardTitleAs = 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// Maps the rendered element to its Dashkit font-size token. `<div>` and `<span>` default to h4 size
// for backward compatibility with pre-`as` callers; explicit heading levels get their matching size
// so swaps from raw `<hN class="card-header-title">` preserve both semantics and visual size.
// `<span>` is provided for cases where the title is a label rather than a semantic heading, and a
// block-level <hN> introduces unwanted line-height/margin from the user-agent stylesheet.
const dashkitTitleSizeByAs: Record<CardTitleAs, string> = {
    div: 'text-dk-h4',
    h1: 'text-dk-h1',
    h2: 'text-dk-h2',
    h3: 'text-dk-h3',
    h4: 'text-dk-h4',
    h5: 'text-dk-h5',
    h6: 'text-dk-h6',
    span: 'text-dk-h4',
};

interface BaseCardTitleProps extends React.HTMLAttributes<HTMLElement>, UIPropOverride {
    as?: CardTitleAs;
}

const BaseCardTitle = React.forwardRef<HTMLElement, BaseCardTitleProps>(
    ({ as = 'div', className, ui, ...props }, ref) => {
        const Element = as as React.ElementType;
        // TODO: fold `sizeClass` into `titleVariants` as an `as` variant (a compound variant keyed on
        // `ui: 'dashkit'` + `as`) so the dashkit size token is part of the CVA config instead of a
        // separate class passed alongside it.
        const sizeClass = ui === 'dashkit' ? dashkitTitleSizeByAs[as] : '';
        return <Element ref={ref} className={cnPrefixed(titleVariants({ ui }), sizeClass, className)} {...props} />;
    },
);
BaseCardTitle.displayName = 'BaseCardTitle';

// OKLCH-only sub-component; no dashkit equivalent so it renders the same in both UIs.
const BaseCardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cnPrefixed('text-sm text-neutral-500', className)} {...props} />
    ),
);
BaseCardDescription.displayName = 'BaseCardDescription';

export {
    BaseCard,
    BaseCardBody,
    BaseCardDescription,
    BaseCardFooter,
    BaseCardHeader,
    BaseCardTitle,
    cardVariants as baseCardVariants,
};
