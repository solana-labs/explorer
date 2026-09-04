import { describe, expect, it } from 'vitest';

// `permanent: true` ⇄ HTTP 308 in Next.js — Next has no other knob for picking 308 vs 307.
import { buildRedirects } from '../redirects.mjs';

describe('next redirects', () => {
    const redirects = buildRedirects();

    it.each([
        { destination: '/', source: '/supply' },
        { destination: '/', source: '/accounts' },
        { destination: '/', source: '/accounts/top' },
        { destination: '/', source: '/verified-programs' },
        { destination: '/address/:address/idl', source: '/address/:address/anchor-program' },
    ])('should respond with 308 redirect for $source → $destination', ({ source, destination }) => {
        const entry = redirects.find(r => r.source === source);
        expect(entry).toMatchObject({ destination, permanent: true, source });
    });

    it('should keep /accounts/top above the /accounts/:address alias to avoid being swallowed', () => {
        const supplyTopIdx = redirects.findIndex(r => r.source === '/accounts/top');
        const accountsAddressIdx = redirects.findIndex(r => r.source === '/accounts/:address');
        expect(supplyTopIdx).toBeGreaterThanOrEqual(0);
        expect(accountsAddressIdx).toBeGreaterThan(supplyTopIdx);
    });
});
