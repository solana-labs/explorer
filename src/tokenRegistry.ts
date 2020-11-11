import { Cluster } from "providers/cluster";

export type TokenDetails = {
  name: string;
  symbol: string;
  logo?: string;
  icon?: string;
  website?: string;
};

function get(address: string, cluster: Cluster): TokenDetails | undefined {
  if (cluster === Cluster.MainnetBeta) return MAINNET_TOKENS[address];
}

function all(cluster: Cluster) {
  if (cluster === Cluster.MainnetBeta) return MAINNET_TOKENS;
  return {};
}

export const TokenRegistry = {
  get,
  all,
};

const MAINNET_TOKENS: { [key: string]: TokenDetails } = {
  SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt: {
    name: "Serum",
    symbol: "SRM",
    logo: "/tokens/serum-64.png",
    icon: "/tokens/serum-32.png",
    website: "https://projectserum.com",
  },
  MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L: {
    name: "MegaSerum",
    symbol: "MSRM",
    logo: "/tokens/serum-64.png",
    icon: "/tokens/serum-32.png",
    website: "https://projectserum.com",
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    logo: "/tokens/usdc.svg",
    icon: "/tokens/usdc.svg",
    website: "https://www.centre.io/",
  },
  "9S4t2NEAiJVMvPdRYKVrfJpBafPBLtvbvyS3DecojQHw": {
    symbol: "FRONT",
    name: "Wrapped FRONT",
    logo: "/tokens/front.svg",
    icon: "/tokens/front.svg",
    website: "https://frontier.xyz/",
  },
  "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E": {
    symbol: "BTC",
    name: "Wrapped Bitcoin",
    logo: "/tokens/bitcoin.svg",
    icon: "/tokens/bitcoin.svg",
  },
  "2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk": {
    symbol: "ETH",
    name: "Wrapped Ethereum",
    logo: "/tokens/ethereum.svg",
    icon: "/tokens/ethereum.svg",
  },
  AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3: {
    symbol: "FTT",
    name: "Wrapped FTT",
    logo: "/tokens/ftt.svg",
    icon: "/tokens/ftt.svg",
  },
  "3JSf5tPeuscJGtaCp5giEiDhv51gQ4v3zWg8DGgyLfAB": {
    symbol: "YFI",
    name: "Wrapped YFI",
    logo: "/tokens/yfi.svg",
    icon: "/tokens/yfi.svg",
  },
  CWE8jPTUYhdCTZYWPTe1o5DFqfdjzWKc9WKz6rSjQUdG: {
    symbol: "LINK",
    name: "Wrapped Chainlink",
    logo: "/tokens/link.svg",
    icon: "/tokens/link.svg",
  },
  Ga2AXHpfAF6mv2ekZwcsJFqu7wB4NV331qNH7fW9Nst8: {
    symbol: "XRP",
    name: "Wrapped XRP",
    logo: "/tokens/xrp.svg",
    icon: "/tokens/xrp.svg",
  },
  BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4: {
    symbol: "USDT",
    name: "Wrapped USDT",
    logo: "/tokens/usdt.svg",
    icon: "/tokens/usdt.svg",
  },
  BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW: {
    symbol: "USDC",
    name: "Wrapped USDC",
  },
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    name: "Wrapped SOL",
  },
  SF3oTvfWzEP3DTwGSvUXRrGTvr75pdZNnBLAH9bzMuX: {
    symbol: "SXP",
    name: "Wrapped Swipe",
    logo: "/tokens/sxp.svg",
    icon: "/tokens/sxp.svg",
  },
  BtZQfWqDGbk9Wf2rXEiWyQBdBY1etnUUn6zEphvVS7yN: {
    symbol: "HGET",
    name: "Wrapped Hedget",
  },
  "873KLxCbz7s9Kc4ZzgYRtNmhfkQrhfyWGZJBmyCbC3ei": {
    symbol: "UBXT",
    name: "Wrapped Upbots",
  },
  CsZ5LZkDS7h9TDKjrbL7VAwQZ9nsRu8vJLhRYfmGaN8K: {
    symbol: "ALEPH",
    name: "Wrapped Aleph",
  },
  "5Fu5UUgbjpUvdBveb3a1JTNirL8rXtiYeSMWvKjtUNQv": {
    symbol: "CREAM",
    name: "Wrapped Cream Finance",
    logo: "/tokens/cream.svg",
    icon: "/tokens/cream.svg",
  },
  HqB7uswoVg4suaQiDP3wjxob1G5WdZ144zhdStwMCq7e: {
    symbol: "HNT",
    name: "Wrapped Helium",
  },
  AR1Mtgh7zAtxuxGd2XPovXPVjcSdY3i4rQYisNadjfKy: {
    symbol: "SUSHI",
    name: "Wrapped Sushi",
  },
};
