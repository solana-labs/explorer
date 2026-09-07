import React from 'react';

/** Section heading with an optional subtitle; `id` provides the in-page anchor target. */
export function SectionTitle({
    children,
    id,
    subtitle,
}: {
    children: React.ReactNode;
    id?: string;
    subtitle?: string;
}) {
    return (
        <div className="mb-5 scroll-mt-6" id={id}>
            <h2 className="m-0 text-2xl font-semibold text-white">{children}</h2>
            {subtitle && <p className="mb-0 mt-1.5 text-sm text-neutral-300">{subtitle}</p>}
        </div>
    );
}
