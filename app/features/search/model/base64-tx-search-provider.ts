import { getBase58Encoder } from '@solana/kit';

import { fromBase64, toBase64, toBase64Url } from '@/app/shared/lib/bytes';
import { MIN_MESSAGE_LENGTH, parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import type { SearchOptions, SearchProvider } from '../lib/types';

const BASE58_ENCODER = getBase58Encoder();

/**
 * Fallback search provider that detects base64-encoded Solana transactions.
 *
 * When the search query is not valid base-58 but successfully decodes as
 * base64 into a parseable Solana transaction, this provider offers a link to
 * the Transaction Inspector with the message and signatures pre-filled. This
 * is useful for debugging unsigned or partially-signed transactions that
 * wallets or dApps produce.
 *
 * @example
 * // Paste a base64-encoded transaction (e.g. from a wallet adapter's
 * // `signTransaction` output) into the search bar to open it in the
 * // Transaction Inspector.
 * //
 * // Example (signed SOL transfer):
 * // AT9a/klcV+7qN71pZySMV1s4Syh/2386n2jGQTh/aSvE1jMtnRCsxGKXyEPANmVAYf4YCGlhl+sc1MjmKSAYMQ8BAAED15BM4xMGhAsMAarG7V9WxisOZNfmH5ljNJst7cO8p0lJ/WaQCDV9dFcICuNi2K6MDt8QY477VBEYDaTWtyraDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgIAAQwCAAAAQEIPAAAAAAA=
 */
export const base64TxSearchProvider: SearchProvider = {
    kind: 'fallback',
    name: 'base64-tx',
    priority: 10,
    search(query: string): SearchOptions[] {
        // Many valid bs58 strings (pubkeys, signatures) are also valid base64.
        // Skip them so they aren't misinterpreted as transactions.
        try {
            BASE58_ENCODER.encode(query);
            return [];
        } catch {
            // Not valid bs58 — continue with base64 attempt
        }

        // Normalise to padded base64 — some tools emit unpadded base64 which
        // atob rejects in strict environments.
        const padded = query.padEnd(Math.ceil(query.length / 4) * 4, '=');

        let decoded: Uint8Array;
        try {
            decoded = fromBase64(padded);
        } catch {
            // atob throws on invalid base64
            return [];
        }

        // Round-trip check: re-encoding must match the padded input to
        // confirm it was genuinely valid base64, not just tolerated junk.
        if (toBase64(decoded) !== padded) {
            return [];
        }

        if (decoded.length < MIN_MESSAGE_LENGTH) {
            return [];
        }

        let parsed;
        try {
            parsed = parseTransactionBytes(decoded);
        } catch {
            return [];
        }

        const pathname = '/tx/inspector';
        const searchParams = new URLSearchParams();

        searchParams.set('message', toBase64Url(parsed.messageBytes));

        if (parsed.signatures) {
            searchParams.set('signatures', JSON.stringify(parsed.signatures));
        }

        return [
            {
                label: 'Transaction Inspector',
                options: [
                    {
                        label: 'Inspect Decoded Transaction',
                        pathname: `${pathname}?${searchParams.toString()}`,
                        type: 'tx/inspector',
                        value: [query],
                    },
                ],
            },
        ];
    },
};
