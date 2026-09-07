import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

const ROBOTS_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

function createRequest(headers?: HeadersInit): Request {
    return new Request('https://explorer.solana.com/robots.txt', { headers });
}

describe('GET /robots.txt', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should serve the allow policy with a Sitemap line when the flag is not set', async () => {
        const response = GET(createRequest());
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body).toContain('Allow: /');
        expect(body).toContain('Disallow: /api/');
        expect(body).toContain('Sitemap: https://explorer.solana.com/sitemap.xml');
    });

    it('should serve the allow policy when the flag is explicitly false', async () => {
        vi.stubEnv('SEO_DISALLOW_BOTS', 'false');

        const body = await GET(createRequest()).text();

        expect(body).toContain('Allow: /');
    });

    it('should serve disallow-all without a Sitemap line when the flag is true', async () => {
        vi.stubEnv('SEO_DISALLOW_BOTS', 'true');

        const response = GET(createRequest());
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body).toContain('Disallow: /');
        expect(body).not.toContain('Allow: /');
        expect(body).not.toContain('Sitemap:');
    });

    it('should set Cache-Control, Content-Type and ETag headers', () => {
        const response = GET(createRequest());

        expect(response.headers.get('Cache-Control')).toBe(ROBOTS_CACHE);
        expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
        const etag = String(response.headers.get('ETag'));
        expect(etag.startsWith('"')).toBe(true);
        expect(etag.endsWith('"')).toBe(true);
        expect(etag.length).toBeGreaterThan(2);
    });

    it('should return 304 without a body when If-None-Match matches', async () => {
        const etag = GET(createRequest()).headers.get('ETag');

        const response = GET(createRequest({ 'If-None-Match': String(etag) }));

        expect(response.status).toBe(304);
        expect(await response.text()).toBe('');
        expect(response.headers.get('ETag')).toBe(etag);
        expect(response.headers.get('Cache-Control')).toBe(ROBOTS_CACHE);
    });

    it('should return 200 when If-None-Match does not match', () => {
        const response = GET(createRequest({ 'If-None-Match': '"stale-etag"' }));

        expect(response.status).toBe(200);
    });

    it('should serve different ETags per policy so a flag flip invalidates cached copies', () => {
        const allowEtag = GET(createRequest()).headers.get('ETag');

        vi.stubEnv('SEO_DISALLOW_BOTS', 'true');
        const disallowEtag = GET(createRequest()).headers.get('ETag');

        expect(disallowEtag).not.toBe(allowEtag);
    });
});
