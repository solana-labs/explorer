import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setPinnedTimestampDisplay, usePinnedTimestampDisplay } from '../use-timestamp-display';

const STORAGE_KEY = 'explorer:timestamp-display';

// atomWithStorage persists via createJSONStorage, so values are JSON-encoded (e.g. `"local"`, not `local`).
function stored(value: string | undefined): string | null {
    return value === undefined ? null : JSON.stringify(value);
}

// Fires the cross-tab `storage` event a browser dispatches to OTHER tabs when localStorage changes
// (jsdom never dispatches it, and never to the writing tab — so we simulate the receiving side).
// jotai only reacts when `storageArea` matches localStorage, mirroring a real browser event.
function dispatchStorageEvent(newValue: string | null) {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue, storageArea: window.localStorage }));
}

describe('use-timestamp-display (localStorage persistence)', () => {
    beforeEach(() => {
        // Reset both the backing store and the atom to a clean, unpinned baseline.
        act(() => setPinnedTimestampDisplay(undefined));
        window.localStorage.clear();
    });

    afterEach(() => {
        act(() => setPinnedTimestampDisplay(undefined));
    });

    it('should write the pinned format to localStorage and remove it when cleared', () => {
        act(() => setPinnedTimestampDisplay('local'));
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(stored('local'));

        act(() => setPinnedTimestampDisplay(undefined));
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should reflect pin/unpin reactively across every subscribed Timestamp', () => {
        const { result } = renderHook(() => usePinnedTimestampDisplay());
        expect(result.current).toBeUndefined(); // nothing pinned → callers default to UTC

        act(() => setPinnedTimestampDisplay('unix'));
        expect(result.current).toBe('unix');

        act(() => setPinnedTimestampDisplay('relative'));
        expect(result.current).toBe('relative');

        act(() => setPinnedTimestampDisplay(undefined));
        expect(result.current).toBeUndefined();
    });

    it('should sync live from another tab via the storage event', () => {
        const { result } = renderHook(() => usePinnedTimestampDisplay());
        expect(result.current).toBeUndefined();

        // Another tab pins "local": it writes localStorage, the browser notifies this tab.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify('local'));
        act(() => dispatchStorageEvent(stored('local')));
        expect(result.current).toBe('local');

        // ...and clears it again.
        window.localStorage.removeItem(STORAGE_KEY);
        act(() => dispatchStorageEvent(null));
        expect(result.current).toBeUndefined();
    });

    it('should ignore an unknown/corrupt stored value (fall back to unpinned → UTC)', () => {
        const { result } = renderHook(() => usePinnedTimestampDisplay());

        window.localStorage.setItem(STORAGE_KEY, 'garbage');
        act(() => dispatchStorageEvent('garbage'));
        expect(result.current).toBeUndefined();
    });

    it('should ignore a storage event when localStorage access is revoked after mount', () => {
        const { result } = renderHook(() => usePinnedTimestampDisplay());
        act(() => setPinnedTimestampDisplay('unix'));
        expect(result.current).toBe('unix');

        // Simulate a context (embedded frame, browser policy) that revokes localStorage access after
        // the atom mounts: every property read now throws. A cross-tab storage event must be ignored,
        // keeping the in-memory preference, instead of throwing out of the subscribe handler.
        // Capture the real storage object for the event's storageArea BEFORE revoking, so building the
        // event doesn't itself trip the throwing getter — the throw must originate inside the handler.
        const realStorage = window.localStorage;
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new DOMException('access denied', 'SecurityError');
            },
        });

        try {
            const event = new StorageEvent('storage', {
                key: STORAGE_KEY,
                newValue: stored('relative'),
                storageArea: realStorage,
            });
            expect(() => act(() => window.dispatchEvent(event))).not.toThrow();
            expect(result.current).toBe('unix');
        } finally {
            Object.defineProperty(window, 'localStorage', { configurable: true, value: realStorage });
        }
    });

    it('should read a value persisted from a previous session on a fresh mount', async () => {
        // Simulate a favorite saved on an earlier visit, then a brand-new page load (fresh module +
        // fresh component) — the value must survive and be read straight out of localStorage.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify('relative'));

        vi.resetModules();
        const fresh = await import('../use-timestamp-display');
        const { result } = renderHook(() => fresh.usePinnedTimestampDisplay());

        expect(result.current).toBe('relative');
    });
});
