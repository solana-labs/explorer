import { withSentryConfig } from "@sentry/nextjs";

const ADDRESS_ALIASES = ["account", "accounts", "addresses"];
const TX_ALIASES = ["txs", "txn", "txns", "transaction", "transactions"];
const SUPPLY_ALIASES = ['accounts', 'accounts/top'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
        pathname: '**',
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


export default withSentryConfig(nextConfig,
  // Sentry Webpack options
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options
    org: "solana",
    project: "explorer",
    silent: true, // Suppresses source map uploading logs during build

  },
  // Sentry config options
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,
  });
