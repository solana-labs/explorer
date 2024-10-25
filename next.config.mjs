const ADDRESS_ALIASES = ["account", "accounts", "addresses"];
const TX_ALIASES = ["txs", "txn", "txns", "transaction", "transactions"];
const SUPPLY_ALIASES = ['accounts', 'accounts/top'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // FIXME: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'raw.githubusercontent.com',
        pathname: '/solana-labs/token-list/main/assets/**',
        port: '',
        protocol: 'https',
      },
    ],
  },
  async redirects() {
    return [
      // Leave this above `ADDRESS_ALIASES`, since it also provides an alias for `/accounts`.
      ...SUPPLY_ALIASES.map(oldRoot => ({
        destination: '/supply',
        permanent: true,
        source: '/' + oldRoot
      })),
      ...ADDRESS_ALIASES.flatMap(oldRoot => (
        [':address', ':address/:tab'].map(path => ({
          destination: '/' + ['address', path].join('/'),
          permanent: true,
          source: '/' + [oldRoot, path].join('/'),
        }))
      )),
      ...TX_ALIASES.map(oldRoot => ({
        destination: '/' + ['tx', ':signature'].join('/'),
        permanent: true,
        source: '/' + [oldRoot, ':signature'].join('/'),
      }
      )),
      {
        destination: '/address/:address',
        permanent: true,
        source: '/address/:address/history',
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on `fs` module like `@project-serum/anchor`.
      config.resolve.fallback.fs = false;
    }
    return config;
  },
};


export default nextConfig;
