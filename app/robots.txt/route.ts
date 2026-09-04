import { createHash } from 'node:crypto';

import { EXPLORER_BASE_URL, isSeoDisallowBots } from '@utils/env';
import { NextResponse } from 'next/server';

import { ifNoneMatchMatches, notModifiedResponse } from '@/app/shared/lib/http-utils';

// Same policy the static file had via next.config seoFileHeaders; the route owns it now.
const ROBOTS_CACHE_HEADERS = {
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};

const ALLOW_BOTS_CONTENT = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${EXPLORER_BASE_URL}/sitemap.xml
`;

const DISALLOW_BOTS_CONTENT = `User-agent: *
Disallow: /
`;

function toVariant(content: string) {
    return { content, etag: `"${createHash('sha256').update(content).digest('base64url')}"` };
}

const ALLOW_BOTS = toVariant(ALLOW_BOTS_CONTENT);
const DISALLOW_BOTS = toVariant(DISALLOW_BOTS_CONTENT);

export function GET(request: Request) {
    const variant = isSeoDisallowBots() ? DISALLOW_BOTS : ALLOW_BOTS;

    if (ifNoneMatchMatches(request.headers, variant.etag)) {
        return notModifiedResponse({ cacheHeaders: ROBOTS_CACHE_HEADERS, etag: variant.etag });
    }

    return new NextResponse(variant.content, {
        headers: {
            ...ROBOTS_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            ETag: variant.etag,
        },
    });
}
