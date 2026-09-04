import { type NextRequest, NextResponse } from 'next/server';

import { Logger } from '@/app/shared/lib/logger';
import { isSeoDisallowBots } from '@/app/utils/env';
import { botIdMiddleware } from '@/config/botid-middleware.mjs';

const SITEMAP_PATHS = new Set(['/sitemap.xml', '/default-sitemap.xml', '/accounts-sitemap.xml']);

// Log runtime once per cold start so any future edge↔node drift is visible without per-request overhead.
let runtimeLogged = false;

export async function proxy(request: NextRequest) {
    if (!runtimeLogged) {
        runtimeLogged = true;
        Logger.info('[proxy] cold start', {
            nodeVersion: typeof process !== 'undefined' && process.versions ? process.versions.node : undefined,
            runtime: 'EdgeRuntime' in globalThis ? 'edge' : 'node',
        });
    }

    if (SITEMAP_PATHS.has(request.nextUrl.pathname)) {
        return isSeoDisallowBots() ? new NextResponse('Not Found', { status: 404 }) : NextResponse.next();
    }

    const blocked = await botIdMiddleware(request);
    return blocked ?? NextResponse.next();
}

export const config = {
    matcher: ['/api/:path*', '/sitemap.xml', '/default-sitemap.xml', '/accounts-sitemap.xml'],
};
