/**
 * How many distinct mints one `/api/token-info` request may carry. The route rejects a
 * larger body and the browser chunks by it, so both must read this one value — keep this
 * module import-free so either side can. The ceiling is ours, not the upstream list's; it
 * exists to bound the on-chain fallback's RPC fan-out.
 */
export const TOKEN_INFO_REQUEST_LIMIT = 256;
