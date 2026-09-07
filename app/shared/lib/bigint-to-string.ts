/**
 * Recursively replaces bigints with their decimal string form.
 *
 * Intended for decoded on-chain account data on its way to a JSON renderer. `JSON.stringify`
 * throws on a bigint, and borsh u64/u128 fields routinely exceed 2^53, so the lossy
 * `withNumbersInsteadOfBigInts` in `./bigint-to-number` cannot stand in here: it would silently
 * corrupt large balances and supplies. Strings preserve every digit at the cost of no longer
 * being numbers, which is acceptable for display-only payloads.
 *
 * Only plain objects and arrays are traversed; anything else (`Uint8Array`, `Map`, `Set`, `Date`,
 * class instances) is passed through untouched rather than flattened into a plain object.
 * Already-visited nodes are passed through as well, so a graph containing a circular reference is
 * handed to the caller intact instead of overflowing the stack.
 */
export function withStringsInsteadOfBigInts(value: unknown, seen = new WeakSet<object>()): unknown {
    if (typeof value === 'bigint') {
        return String(value);
    }
    if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return value;
        seen.add(value);
    }
    if (Array.isArray(value)) {
        return value.map(item => withStringsInsteadOfBigInts(item, seen));
    }
    if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, withStringsInsteadOfBigInts(item, seen)]),
        );
    }
    return value;
}
