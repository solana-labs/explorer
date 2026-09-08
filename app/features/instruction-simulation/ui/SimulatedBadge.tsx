import type { ReactNode } from 'react';

import { Badge } from '@/app/components/shared/ui/badge';

// Accent-outlined chip marking simulation-derived UI, shared so every instance stays identical.
export function SimulatedBadge({ children }: { children: ReactNode }) {
    return (
        <Badge ui="dashkit" className="border-accent/50 border border-solid !text-[10px] text-accent">
            {children}
        </Badge>
    );
}
