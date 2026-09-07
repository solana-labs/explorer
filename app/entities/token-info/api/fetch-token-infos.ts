import { chunk } from '@shared/lib/array';
import { Cluster } from '@utils/cluster';
import { fetchAll } from '@utils/fetch-all';
import { fetchTokenInfosFromApi } from '@utils/token-info';

import { createAbortSignal } from '../lib/create-abort-signal';
import { TOKEN_INFO_REQUEST_LIMIT } from '../lib/request-limit';
import type { TokenInfo } from '../lib/types';

// Bounds the fan-out: a whale address would otherwise put every chunk on the wire at once.
const CHUNK_CONCURRENCY = 6;

// Per chunk, and comfortably above the one upstream call the route makes for a chunk this size.
// The margin is for a cold start; the point is that a stalled chunk cannot hold the card forever.
const CHUNK_TIMEOUT_MS = 15_000;

/**
 * Resolves the whole list at once, because a mint cannot be ordered by verification
 * until its metadata is known. The on-chain fallback stays off: a mint the UTL list
 * does not carry is simply absent, and that absence is the answer callers need.
 */
export async function fetchTokenInfos(
    addresses: readonly string[],
    cluster: Cluster,
    genesisHash?: string,
): Promise<Map<string, TokenInfo>> {
    // Sorted, because the upstream cache keys on the request body: the RPC returns an account's
    // holdings in no guaranteed order, so without this the same holdings chunk differently for
    // each visitor and none of them hit the cache. The caller orders the rows itself.
    const unique = Array.from(new Set(addresses)).sort();

    // Per chunk, not all-or-nothing: `fetchAll` rejects as a whole, so a chunk that throws is
    // caught here and joins the ones that merely failed to resolve. Its mints then sort last
    // whatever they are, so a failure demotes verified holdings rather than leaving them put.
    const results = await fetchAll(
        chunk(unique, TOKEN_INFO_REQUEST_LIMIT),
        batch =>
            fetchTokenInfosFromApi({
                addresses: batch,
                cluster,
                genesisHash,
                includeOnChainFallback: false,
                signal: createAbortSignal(CHUNK_TIMEOUT_MS),
            }).catch(() => undefined),
        CHUNK_CONCURRENCY,
    );

    const byAddress = new Map<string, TokenInfo>();
    for (const tokens of results) {
        for (const token of tokens ?? []) {
            byAddress.set(token.address, token);
        }
    }

    return byAddress;
}
