import type { TokenInfo } from './types';

/**
 * Holdings arrive from the RPC in arbitrary order and an account can hold thousands of
 * airdropped mints, so the first screen is otherwise random. A mint absent from
 * `tokenInfos` is one the unified token list does not carry, which includes any mint
 * whose lookup failed. Nothing is dropped; junk sinks.
 */
export function orderMintsByVerification(
    mints: readonly string[],
    tokenInfos: ReadonlyMap<string, TokenInfo>,
): string[] {
    const verified: string[] = [];
    const listed: string[] = [];
    const unlisted: string[] = [];

    for (const mint of mints) {
        const info = tokenInfos.get(mint);
        if (!info) {
            unlisted.push(mint);
        } else if (info.verified) {
            verified.push(mint);
        } else {
            listed.push(mint);
        }
    }

    return [...verified, ...listed, ...unlisted];
}
