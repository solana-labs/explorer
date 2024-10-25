import React from 'react';

import { IdlSpec } from '@/app/utils/convertLegacyIdl';

interface IDLBadgeProps {
    spec: IdlSpec;
}

export function IDLBadge({ spec }: IDLBadgeProps) {
    const badgeClass = spec === 'legacy' ? 'bg-warning' : 'bg-success';
    const badgeText = spec === 'legacy' ? 'Legacy' : '0.30.1';

    return <span className={`badge ${badgeClass}`}>{badgeText} Anchor IDL</span>;
}
