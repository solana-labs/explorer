'use client';

import dynamic from 'next/dynamic';
import { ComponentProps, useMemo } from 'react';

import { withStringsInsteadOfBigInts } from '@/app/shared/lib/bigint-to-string';

// Dynamically import @microlink/react-json-view with SSR disabled
const ReactJsonView = dynamic(() => import('@microlink/react-json-view'), {
    loading: () => <div className="text-dk-gray-700">Loading JSON viewer...</div>,
    ssr: false,
});

export type JsonViewerProps = ComponentProps<typeof ReactJsonView>;

/**
 * A wrapper component for react-json-view that handles SSR properly.
 * This prevents the "document is not defined" error during server-side rendering.
 */
export function JsonViewer({ src, ...props }: JsonViewerProps) {
    const safeSrc = useMemo(() => withStringsInsteadOfBigInts(src) as JsonViewerProps['src'], [src]);
    return <ReactJsonView src={safeSrc} {...props} />;
}

/**
 * Pre-configured JsonViewer with the solarized theme
 * commonly used across the application
 */
export function SolarizedJsonViewer(props: Omit<JsonViewerProps, 'theme'>) {
    return <JsonViewer theme="solarized" {...props} />;
}
