'use client';

import { useEffect, useState } from 'react';

/** Shown during SSR and when JS is unavailable; replaced with the real origin after mount. */
export const DEPLOYMENT_PLACEHOLDER = 'https://<deployment>';

/**
 * Origin of the deployment the visitor is on, so config snippets are copy-ready
 * for exactly this Explorer instance.
 */
export function useDeploymentOrigin(): string {
    const [origin, setOrigin] = useState<string>();
    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);
    return origin ?? DEPLOYMENT_PLACEHOLDER;
}
