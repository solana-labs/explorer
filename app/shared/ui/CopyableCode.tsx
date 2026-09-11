import React from 'react';

import { Copyable } from '@/app/components/common/Copyable';

/** Wrapping code block with a trailing copy glyph — used for long values like the verify command. */
export function CopyableCode({ value }: { value: string }) {
    return (
        <div className="flex min-w-0 items-start gap-2 rounded-md border border-solid border-dark-border bg-black/20 px-2 py-1">
            <pre className="mb-0 min-w-0 flex-1 whitespace-pre-wrap break-words bg-transparent font-mono">{value}</pre>
            <span className="mt-1 shrink-0">
                <Copyable text={value} />
            </span>
        </div>
    );
}
