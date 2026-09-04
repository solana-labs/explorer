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
        // Reads are best-effort: if browser policy or an embedded context blocks localStorage, fall
        // back to "not pinned" instead of throwing out of Timestamp's render.
        try {
            const value = jsonStorage.getItem(key, initialValue);
            return isTimestampDisplay(value) ? value : undefined;
        } catch {
            return undefined;
        }
    },
    // Removes are best-effort for the same reason writes are (see setItem).
    removeItem: key => {
        try {
            jsonStorage.removeItem(key);
        } catch {
            // ignore — the in-memory atom value is still the source of truth for this session.
        }
    },
    // Writes are best-effort: when localStorage is unavailable, the pin still updates the in-memory
    // atom for this session rather than throwing out of the pin/unpin action. Clearing the pin
    // (undefined) removes the key rather than persisting the literal string "undefined" (what
    // JSON.stringify(undefined) would otherwise write to localStorage).
    setItem: (key, value) => {
        try {
            if (value === undefined) {
                jsonStorage.removeItem(key);
            } else {
                jsonStorage.setItem(key, value);
            }
        } catch {
            // ignore — the in-memory atom value is still the source of truth for this session.
        }
    },
    subscribe:
        baseSubscribe &&
        ((key, callback, initialValue) => {
            // Subscribing is best-effort too: if localStorage is blocked, skip cross-tab sync and
            // return a no-op unsubscribe rather than throwing when the atom mounts.
            try {
                return baseSubscribe(
                    key,
                    // The storage-event callback fires asynchronously and re-reads localStorage, so it
                    // runs outside the synchronous guard above. Wrap it too: if access is revoked after
                    // mount, ignore the event and keep the in-memory preference instead of throwing.
                    value => {
                        try {
                            callback(isTimestampDisplay(value) ? value : undefined);
                        } catch {
                            // ignore — retain the current in-memory atom value for this session.
                        }
                    },
                    initialValue,
                );
            } catch {
                return () => {};
            }
        }),
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
