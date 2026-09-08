const ADDRESS_ALIASES = ['account', 'accounts', 'addresses'];
const TX_ALIASES = ['txs', 'txn', 'txns', 'transaction', 'transactions'];
const SUPPLY_ALIASES = ['accounts', 'accounts/top', 'supply'];

/**
 * Build the permanent (HTTP 308) redirect table consumed by `next.config.mjs`.
 * Extracted so it can be unit-tested without loading the Sentry/BotID wrappers.
 *
 * @returns {Array<{ source: string; destination: string; permanent: true }>}
 */
export function buildRedirects() {
    return [
        // Legacy redirects: /accounts and /accounts/top served the former Supply / Top Accounts pages — keep as 308s while old links propagate, then drop.
        // Leave this above `ADDRESS_ALIASES`, since it also provides an alias for `/accounts`.
        ...SUPPLY_ALIASES.map(oldRoot => ({
            destination: '/',
            permanent: true,
            source: `/${oldRoot}`,
        })),
        ...ADDRESS_ALIASES.flatMap(oldRoot =>
            [':address', ':address/:tab'].map(path => ({
                destination: `/${['address', path].join('/')}`,
                permanent: true,
                source: `/${[oldRoot, path].join('/')}`,
            })),
        ),
        ...TX_ALIASES.map(oldRoot => ({
            destination: `/${['tx', ':signature'].join('/')}`,
            permanent: true,
            source: `/${[oldRoot, ':signature'].join('/')}`,
        })),
        {
            destination: '/address/:address',
            permanent: true,
            source: '/address/:address/history',
        },
        // Renamed-tab redirect: a program may have several IDLs, so the Anchor-specific tab became `/idl`.
        // Here rather than in the page, because a page's `redirect()` drops the query and would strand an
        // incoming devnet link on mainnet.
        {
            destination: '/address/:address/idl',
            permanent: true,
            source: '/address/:address/anchor-program',
        },
        // Removed-page redirect: keep as 308 while external links/crawlers update, then drop.
        {
            destination: '/',
            permanent: true,
            source: '/verified-programs',
        },
    ];
}
