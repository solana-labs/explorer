import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { displayTimestampAbsolute } from '@/app/utils/date';

import { Timestamp } from '../timestamp';
import { setPinnedTimestampDisplay } from '../use-timestamp-display';

// The react-dom/server helpers are called inline in assertions rather than stored in a variable:
// eslint's testing-library render-result rule treats any wrapper around a `render*` call as a render
// util and would demand a `view`/`utils` name for the resulting HTML string, which it isn't.
function ssrMarkup(element: ReactElement): string {
    return renderToStaticMarkup(element);
}
function ssrHtml(element: ReactElement): string {
    return renderToString(element);
}

// Aug 6, 2026 06:41:51 UTC — a fixed instant (the reference-design value).
const UNIX = 1785998511;
const MS = UNIX * 1000;

// The `local` label and the `relative` fallback are timezone-/clock-dependent, so the server renders
// them in the server's zone and the client re-renders them in the browser's zone. If those strings
// differ, hydration breaks. These tests run under a fixed non-UTC zone so "local" and "UTC" are
// distinguishable, then assert the server only ever emits the timezone-independent UTC value — the
// exact guarantee that makes local/relative safe to hydrate (previously only UTC was).
let originalTZ: string | undefined;

beforeAll(() => {
    originalTZ = process.env.TZ;
});

afterAll(() => {
    process.env.TZ = originalTZ;
});

beforeEach(() => {
    process.env.TZ = 'America/New_York';
    setPinnedTimestampDisplay(undefined);
});

afterEach(() => {
    setPinnedTimestampDisplay(undefined);
});

describe('Timestamp SSR / first client render (hydration-safe)', () => {
    it('should render the `local` format as UTC on the server, not the viewer-local time', () => {
        const utc = displayTimestampAbsolute(MS, true);
        const local = displayTimestampAbsolute(MS, false);
        // Guard: the test env must be a non-UTC zone, otherwise the assertion below is vacuous.
        expect(utc).not.toEqual(local);

        expect(ssrMarkup(<Timestamp unixTimestamp={UNIX} display="local" />)).toContain(utc);
        expect(ssrMarkup(<Timestamp unixTimestamp={UNIX} display="local" />)).not.toContain(local);
    });

    it('should render the `relative` format as UTC on the server, not the local absolute fallback', () => {
        const utc = displayTimestampAbsolute(MS, true);
        const local = displayTimestampAbsolute(MS, false);

        expect(ssrMarkup(<Timestamp unixTimestamp={UNIX} display="relative" />)).toContain(utc);
        expect(ssrMarkup(<Timestamp unixTimestamp={UNIX} display="relative" />)).not.toContain(local);
        // No relative phrasing before the client clock is available.
        expect(ssrMarkup(<Timestamp unixTimestamp={UNIX} display="relative" />)).not.toContain('ago');
    });

    it('should render the `utc` format as UTC on the server (always hydration-safe)', () => {
        const utc = displayTimestampAbsolute(MS, true);
        expect(ssrMarkup(<Timestamp unixTimestamp={UNIX} display="utc" />)).toContain(utc);
    });
});

describe('Timestamp after mounting on the client', () => {
    it('should upgrade the `local` label to the viewer-local time', () => {
        const local = displayTimestampAbsolute(MS, false);
        render(<Timestamp unixTimestamp={UNIX} display="local" />);
        expect(screen.getByRole('button')).toHaveTextContent(local);
    });

    it('should upgrade the `relative` label to a relative string', () => {
        // A firmly-past instant so the live clock always resolves to "… ago".
        const pastUnix = 1000000000; // Sep 2001
        render(<Timestamp unixTimestamp={pastUnix} display="relative" />);
        expect(screen.getByRole('button')).toHaveTextContent('ago');
    });
});

describe('Timestamp hydration across differing timezones', () => {
    it('should hydrate without a mismatch warning when server and client zones differ', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const container = document.createElement('div');
        document.body.appendChild(container);

        // Render the "server" markup in one zone...
        process.env.TZ = 'America/New_York';
        container.innerHTML = ssrHtml(<Timestamp unixTimestamp={UNIX} display="local" />);

        // ...then hydrate on a "client" in a different zone. With the fix both sides emit the
        // timezone-independent UTC string, so hydration matches; before the fix the `local` label
        // differed between the two zones and React logged a text-content mismatch.
        process.env.TZ = 'Asia/Tokyo';
        act(() => {
            hydrateRoot(container, <Timestamp unixTimestamp={UNIX} display="local" />);
        });

        const hydrationMarkers = ['hydrat', 'did not match', 'server-rendered', 'server rendered', 'text content'];
        const hydrationWarnings = errorSpy.mock.calls.filter(args => {
            const message = String(args[0]).toLowerCase();
            return hydrationMarkers.some(marker => message.includes(marker));
        });
        expect(hydrationWarnings).toEqual([]);

        // After hydration effects run, the label upgrades to the client-zone (Tokyo) local time.
        expect(screen.getByRole('button')).toHaveTextContent(displayTimestampAbsolute(MS, false));

        errorSpy.mockRestore();
        container.remove();
    });
});
