import React from 'react';

/** Label/value pair in the hero fact grid (status, endpoint, transport, …). */
export function HeroFact({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm uppercase tracking-wide text-neutral-500">{label}</span>
            <span className="text-sm text-neutral-200">{children}</span>
        </div>
    );
}
