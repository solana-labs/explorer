/**
 * Returns the array unchanged, or an empty array when it is null/undefined.
 */
export function arrayOrEmpty<T>(items: T[] | null | undefined): T[] {
    return items ?? [];
}

/**
 * Splits into runs of at most `size`. Anything but a positive integer is rejected: below 1 the
 * loop would not terminate, `NaN` would drop every item, and a fraction would overrun `size`.
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
    if (!Number.isInteger(size) || size < 1) throw new Error(`chunk size must be a positive integer, got ${size}`);

    const chunks: T[][] = [];
    for (let start = 0; start < items.length; start += size) {
        chunks.push(items.slice(start, start + size));
    }
    return chunks;
}
