'use client';

import { useSyncExternalStore } from 'react';

// The representations a Timestamp can render. `unix` shows the raw seconds, `relative` shows "X ago".
// Single source of truth for both the type and the runtime guard so the two can't drift.
const DISPLAYS = ['utc', 'local', 'unix', 'relative'] as const;
export type TimestampDisplay = (typeof DISPLAYS)[number];

function isTimestampDisplay(value: unknown): value is TimestampDisplay {
    return DISPLAYS.includes(value as TimestampDisplay);
}

const STORAGE_KEY = 'explorer:timestamp-display';

// A module-level store shared by every Timestamp instance: pinning in one dropdown
// re-renders all of them, the choice survives reloads, and the `storage` event keeps
// other tabs in sync. Backed by useSyncExternalStore so SSR/hydration stays consistent.
// `undefined` means "not pinned"; `cacheValid` distinguishes that from "not yet read".
const listeners = new Set<() => void>();
let cached: TimestampDisplay | undefined;
let cacheValid = false;

function readStorage(): TimestampDisplay | undefined {
    if (typeof window === 'undefined') return undefined;
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isTimestampDisplay(value) ? value : undefined;
}

function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);
    const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) {
            cacheValid = false; // force a re-read on the next snapshot
            onChange();
        }
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(onChange);
        window.removeEventListener('storage', onStorage);
    };
}

function getSnapshot(): TimestampDisplay | undefined {
    if (!cacheValid) {
        cached = readStorage();
        cacheValid = true;
    }
    return cached;
}

function getServerSnapshot(): TimestampDisplay | undefined {
    return undefined;
}

/** Pin (or, with `undefined`, clear) the representation every Timestamp shows by default. */
export function setPinnedTimestampDisplay(value: TimestampDisplay | undefined): void {
    if (typeof window !== 'undefined') {
        if (value === undefined) window.localStorage.removeItem(STORAGE_KEY);
        else window.localStorage.setItem(STORAGE_KEY, value);
    }
    cached = value;
    cacheValid = true;
    listeners.forEach(listener => listener());
}

/** The currently pinned representation, or `undefined` when the user hasn't pinned one. */
export function usePinnedTimestampDisplay(): TimestampDisplay | undefined {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
