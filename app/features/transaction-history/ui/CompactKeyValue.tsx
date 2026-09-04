import React from 'react';

import { KeyValue } from '@/app/shared/ui/key-value';

/** Compact, white-value KeyValue row shared by the transaction drawer and the mobile history rows. */
export function CompactKeyValue({
    label,
    trailing,
    divider = true,
    children,
}: {
    label: React.ReactNode;
    trailing?: React.ReactNode;
    divider?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <KeyValue
            density="compact"
            divider={divider}
            labelWidth="w-20"
            valueClassName="text-white"
            trailing={trailing}
            label={label}
        >
            {children}
        </KeyValue>
    );
}
