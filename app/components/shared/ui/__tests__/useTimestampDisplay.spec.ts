import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setPinnedTimestampDisplay, usePinnedTimestampDisplay } from '../useTimestampDisplay';

const STORAGE_KEY = 'explorer:timestamp-display';

// Fires the cross-tab `storage` event a browser dispatches to OTHER tabs when localStorage changes
// (jsdom never dispatches it, and never to the writing tab — so we simulate the receiving side).
function dispatchStorageEvent(newValue: string | null) {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue }));
}

describe('useTimestampDisplay (localStorage persistence)', () => {
    beforeEach(() => {
        // Reset both the backing store and the module's internal cache to a clean, unpinned baseline.
        act(() => setPinnedTimestampDisplay(undefined));
        window.localStorage.clear();
    });

    afterEach(() => {
        act(() => setPinnedTimestampDisplay(undefined));
    });

    it('should write the pinned format to localStorage and remove it when cleared', () => {
        act(() => setPinnedTimestampDisplay('local'));
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('local');

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
        window.localStorage.setItem(STORAGE_KEY, 'local');
        act(() => dispatchStorageEvent('local'));
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

    it('should read a value persisted from a previous session on a fresh mount', async () => {
        // Simulate a favorite saved on an earlier visit, then a brand-new page load (fresh module +
        // fresh component) — the value must survive and be read straight out of localStorage.
        window.localStorage.setItem(STORAGE_KEY, 'relative');

        vi.resetModules();
        const fresh = await import('../useTimestampDisplay');
        const { result } = renderHook(() => fresh.usePinnedTimestampDisplay());

        expect(result.current).toBe('relative');
    });
});
