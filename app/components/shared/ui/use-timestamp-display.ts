import 'client-only';

import { getDefaultStore, useAtomValue } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

// The representations a Timestamp can render. `unix` shows the raw seconds, `relative` shows "X ago".
// Single source of truth for both the type and the runtime guard so the two can't drift.
const DISPLAYS = ['utc', 'local', 'unix', 'relative'] as const;
export type TimestampDisplay = (typeof DISPLAYS)[number];

function isTimestampDisplay(value: unknown): value is TimestampDisplay {
    return DISPLAYS.includes(value as TimestampDisplay);
}

const STORAGE_KEY = 'explorer:timestamp-display';

// Persistence, cross-tab `storage`-event sync, and an SSR-safe default all come from atomWithStorage —
// we only wrap the JSON storage to validate, so a corrupt or foreign value falls back to "not pinned"
// (undefined) instead of rendering garbage. No getOnInit: the atom starts undefined to match SSR and
// hydrates to the stored value on mount, avoiding a hydration mismatch.
const jsonStorage = createJSONStorage<TimestampDisplay | undefined>(() => window.localStorage);
const baseSubscribe = jsonStorage.subscribe;
const validatedStorage: typeof jsonStorage = {
    ...jsonStorage,
    getItem: (key, initialValue) => {
        const value = jsonStorage.getItem(key, initialValue);
        return isTimestampDisplay(value) ? value : undefined;
    },
    // Clearing the pin (undefined) removes the key rather than persisting the literal string
    // "undefined" (what JSON.stringify(undefined) would otherwise write to localStorage).
    setItem: (key, value) => (value === undefined ? jsonStorage.removeItem(key) : jsonStorage.setItem(key, value)),
    subscribe:
        baseSubscribe &&
        ((key, callback, initialValue) =>
            baseSubscribe(key, value => callback(isTimestampDisplay(value) ? value : undefined), initialValue)),
};

/** The global, persisted preference for which representation every Timestamp shows by default. */
export const pinnedTimestampDisplayAtom = atomWithStorage<TimestampDisplay | undefined>(
    STORAGE_KEY,
    undefined,
    validatedStorage,
);

/** The currently pinned representation, or `undefined` when the user hasn't pinned one. */
export function usePinnedTimestampDisplay(): TimestampDisplay | undefined {
    return useAtomValue(pinnedTimestampDisplayAtom);
}

/** Pin (or, with `undefined`, clear) the representation every Timestamp shows by default. */
export function setPinnedTimestampDisplay(value: TimestampDisplay | undefined): void {
    getDefaultStore().set(pinnedTimestampDisplayAtom, value);
}
