import { cn } from '@components/shared/utils';
import { type ReactNode, useId } from 'react';

import { baseCardVariants } from '@/app/shared/ui/Card';

// Non-collapsible counterpart of {@link CollapsibleSection}: identical header + card-body markup, but
// without the expand/collapse toggle. Used where a section is always open yet still needs the shared
// heading chrome and a scroll-spy anchor (`id`) + `data-section-title` marker (read by the sticky logs
// scroll-sync) — e.g. the inspector's Signatures / Programs sections.
export function Section({
    id,
    title,
    actions,
    children,
    className = baseCardVariants({ ui: 'dashkit' }),
    titleClassName,
    sectionClassName,
}: {
    id?: string;
    title: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    titleClassName?: string;
    sectionClassName?: string;
}) {
    const headingId = useId();

    return (
        <section id={id} aria-labelledby={headingId} className={cn('flex flex-col gap-3', sectionClassName)}>
            <div data-section-title className={cn('flex items-center justify-between', titleClassName)}>
                <h2 id={headingId} className="m-0 text-lg font-normal text-white">
                    {title}
                </h2>
                {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
            </div>
            <div className={className}>{children}</div>
        </section>
    );
}
