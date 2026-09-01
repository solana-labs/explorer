import { MANGO_PROGRAM_IDS, MANGO_V3_PROGRAM_LABEL } from '@explorer/decoder-mango';
import { PYTH_ORACLE_PROGRAM_IDS, PYTH_ORACLE_PROGRAM_LABEL } from '@explorer/decoder-pyth/detection';
import {
    OPEN_BOOK_PROGRAM_IDS,
    OPENBOOK_DEX_PROGRAM_LABEL,
    SERUM_DEX_V1_PROGRAM_IDS,
    SERUM_DEX_V1_PROGRAM_LABEL,
    SERUM_DEX_V1B_PROGRAM_IDS,
    SERUM_DEX_V2_PROGRAM_IDS,
    SERUM_DEX_V2_PROGRAM_LABEL,
    SERUM_DEX_V3_PROGRAM_IDS,
    SERUM_DEX_V3_PROGRAM_LABEL,
} from '@explorer/decoder-serum/detection';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

import { Cluster } from './cluster';

export enum PROGRAM_NAMES {
    // native built-ins
    ADDRESS_LOOKUP_TABLE = 'Address Lookup Table Program',
    COMPUTE_BUDGET = 'Compute Budget Program',
    CONFIG = 'Config Program',
    FEATURE_GATE = 'Feature Gate Program',
    STAKE = 'Stake Program',
    SYSTEM = 'System Program',
    VOTE = 'Vote Program',

    // native precompiles
    SECP256K1 = 'Secp256k1 SigVerify Precompile',
    ED25519 = 'Ed25519 SigVerify Precompile',

    // spl
    ASSOCIATED_TOKEN = 'Associated Token Program',
    ACCOUNT_COMPRESSION = 'State Compression Program',
    FEATURE_PROPOSAL = 'Feature Proposal Program',
    LENDING = 'Lending Program',
    MEMO_1 = 'Memo Program v1',
    MEMO = 'Memo Program',
    NAME = 'Name Service Program',
    STAKE_POOL = 'Stake Pool Program',
    SWAP = 'Swap Program',
    TOKEN = 'Token Program',
    TOKEN_2022 = 'Token-2022 Program',
    TOKEN_METADATA = 'Token Metadata Program',
    TOKEN_VAULT = 'Token Vault Program',
    PROGRAM_METADATA = 'Program Metadata Program',

    // foundation programs
    SAS_PROGRAM = 'Solana Attestation Service Program',

    // other
    CHAINLINK_DATA_STREAMS_VERIFIER = 'Chainlink Data Streams Verifier Program',
    CHAINLINK_ORACLE = 'Chainlink OCR2 Oracle Program',
    CHAINLINK_STORE = 'Chainlink Store Program',
    MARINADE = 'Marinade Staking Program',
    NFT_CANDY_MACHINE = 'NFT Candy Machine Program',
    NFT_CANDY_MACHINE_V2 = 'NFT Candy Machine Program V2',
    ORAO_VRF_2 = 'ORAO VRF v2',
    ORCA_SWAP_1 = 'Orca Swap Program v1',
    ORCA_SWAP_2 = 'Orca Swap Program v2',
    ORE = 'ORE Program',
    RAYDIUM_AMM = 'Raydium AMM Program',
    RAYDIUM_LP_1 = 'Raydium Liquidity Pool Program v1',
    RAYDIUM_LP_2 = 'Raydium Liquidity Pool Program v2',
    RAYDIUM_STAKING = 'Raydium Staking Program',
    SWITCHBOARD = 'Switchboard Oracle Program',
    WORMHOLE = 'Wormhole',
    WORMHOLE_CORE = 'Wormhole Core Bridge',
    WORMHOLE_TOKEN = 'Wormhole Token Bridge',
    WORMHOLE_NFT = 'Wormhole NFT Bridge',

    // ZK Compression
    ZK_LIGHT_SYSTEM_PROGRAM = 'Light System Program',
    ZK_COMPRESSED_TOKEN_PROGRAM = 'ZK Compressed Token Program',
    ZK_ACCOUNT_COMPRESSION_PROGRAM = 'ZK Account Compression Program',

    // ZK ElGamal Proof
    ZK_ELGAMAL_PROOF = 'ZK ElGamal Proof Program',

    // Lighthouse
    LIGHTHOUSE_PROGRAM = 'Lighthouse Program',

    // Subscriptions
    SUBSCRIPTIONS_PROGRAM = 'Subscriptions Program',
}

const ALL_CLUSTERS = [Cluster.Custom, Cluster.Devnet, Cluster.Testnet, Cluster.MainnetBeta];

const LIVE_CLUSTERS = [Cluster.Devnet, Cluster.Testnet, Cluster.MainnetBeta];

export const LOADER_IDS: { [key: string]: string } = {
    BPFLoader1111111111111111111111111111111111: 'BPF Loader',
    BPFLoader2111111111111111111111111111111111: 'BPF Loader 2',
    BPFLoaderUpgradeab1e11111111111111111111111: 'BPF Upgradeable Loader',
    MoveLdr111111111111111111111111111111111111: 'Move Loader',
    NativeLoader1111111111111111111111111111111: 'Native Loader',
} as const;

export type LoaderName = (typeof LOADER_IDS)[keyof typeof LOADER_IDS];

export type ProgramInfo = {
    name: string;
    deployments: Cluster[];
};

export const ZK_ELGAMAL_PROOF_PROGRAM_ID = 'ZkE1Gama1Proof11111111111111111111111111111';

export const PROGRAM_INFO_BY_ID: { [address: string]: ProgramInfo } = {
    '11111111111111111111111111111111': {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.SYSTEM,
    },
    '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG': {
        deployments: [Cluster.MainnetBeta, Cluster.Devnet],
        name: PROGRAM_NAMES.SAS_PROGRAM,
    },
    '27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv': {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.RAYDIUM_LP_2,
    },
    '2rHhojZ7hpu1zA91nvZmT8TqWWvMcKmmNBCr2mKTtMq4': {
        deployments: [Cluster.Devnet],
        name: PROGRAM_NAMES.WORMHOLE_NFT,
    },
    '3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5': {
        deployments: [Cluster.Devnet],
        name: PROGRAM_NAMES.WORMHOLE_CORE,
    },
    [SERUM_DEX_V1_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: SERUM_DEX_V1_PROGRAM_LABEL,
    },
    [MANGO_PROGRAM_IDS.devnet]: {
        deployments: [Cluster.Devnet],
        name: MANGO_V3_PROGRAM_LABEL,
    },
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.RAYDIUM_AMM,
    },
    [PYTH_ORACLE_PROGRAM_IDS.testnet]: {
        deployments: [Cluster.Testnet],
        name: PYTH_ORACLE_PROGRAM_LABEL,
    },
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.ORCA_SWAP_2,
    },
    [SERUM_DEX_V3_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: SERUM_DEX_V3_PROGRAM_LABEL,
    },
    // spl
    ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.ASSOCIATED_TOKEN,
    },

    // native built-ins
    AddressLookupTab1e1111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.ADDRESS_LOOKUP_TABLE,
    },

    ComputeBudget111111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.COMPUTE_BUDGET,
    },
    [SERUM_DEX_V1B_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: SERUM_DEX_V1_PROGRAM_LABEL,
    },
    [MANGO_PROGRAM_IDS.testnet]: {
        deployments: [Cluster.Testnet],
        name: MANGO_V3_PROGRAM_LABEL,
    },
    Config1111111111111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.CONFIG,
    },
    DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe: {
        deployments: [Cluster.Devnet],
        name: PROGRAM_NAMES.WORMHOLE_TOKEN,
    },
    De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44: {
        deployments: [Cluster.MainnetBeta, Cluster.Devnet],
        name: PROGRAM_NAMES.SUBSCRIPTIONS_PROGRAM,
    },
    DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.ORCA_SWAP_1,
    },
    DtmE9D2CSB4L5D6A15mraeEjrGMm6auWVzgaD8hK2tZM: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.SWITCHBOARD,
    },
    [SERUM_DEX_V2_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: SERUM_DEX_V2_PROGRAM_LABEL,
    },
    Ed25519SigVerify111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.ED25519,
    },
    EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.RAYDIUM_STAKING,
    },
    Feat1YXHhH6t1juaWF74WLcfv4XoNocjXA6sPWHNgAse: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.FEATURE_PROPOSAL,
    },
    Feature111111111111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.FEATURE_GATE,
    },
    [PYTH_ORACLE_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: PYTH_ORACLE_PROGRAM_LABEL,
    },
    Gt9S41PtjR58CbG9JhJ3J6vxesqrNAswbWYbLNTMZA3c: {
        deployments: [Cluster.Devnet, Cluster.MainnetBeta],
        name: PROGRAM_NAMES.CHAINLINK_DATA_STREAMS_VERIFIER,
    },
    HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny: {
        deployments: [Cluster.Devnet, Cluster.MainnetBeta],
        name: PROGRAM_NAMES.CHAINLINK_STORE,
    },
    KeccakSecp256k11111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.SECP256K1,
    },
    L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.LIGHTHOUSE_PROGRAM,
    },
    LendZqTs7gn5CTSJU1jWKhKuVpjJGom45nnwPb2AMTi: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.LENDING,
    },
    MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.MARINADE,
    },
    Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.MEMO_1,
    },
    MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.MEMO,
    },
    ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.PROGRAM_METADATA,
    },
    RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.RAYDIUM_LP_1,
    },
    SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.STAKE_POOL,
    },
    Stake11111111111111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.STAKE,
    },
    SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.SWAP,
    },
    SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7: {
        deployments: [Cluster.MainnetBeta, Cluster.Devnet],
        name: PROGRAM_NAMES.ZK_LIGHT_SYSTEM_PROGRAM,
    },
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.TOKEN,
    },
    TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.TOKEN_2022,
    },
    VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y: {
        deployments: [Cluster.Devnet, Cluster.MainnetBeta],
        name: PROGRAM_NAMES.ORAO_VRF_2,
    },
    Vote111111111111111111111111111111111111111: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.VOTE,
    },
    WnFt12ZrnzZrFZkt2xsNsaNWoQribnuQ5B5FrDbwDhD: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.WORMHOLE_NFT,
    },
    WormT3McKhFJ2RkiGpdw9GKvNCrB2aB54gb2uV9MfQC: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.WORMHOLE,
    },
    [ZK_ELGAMAL_PROOF_PROGRAM_ID]: {
        deployments: ALL_CLUSTERS,
        name: PROGRAM_NAMES.ZK_ELGAMAL_PROOF,
    },
    cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m: {
        deployments: [Cluster.MainnetBeta, Cluster.Devnet],
        name: PROGRAM_NAMES.ZK_COMPRESSED_TOKEN_PROGRAM,
    },
    cjg3oHmg9uuPsP8D6g29NWvhySJkdYdAo9D25PRbKXJ: {
        deployments: [Cluster.Devnet, Cluster.MainnetBeta],
        name: PROGRAM_NAMES.CHAINLINK_ORACLE,
    },
    cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK: {
        deployments: [Cluster.Devnet, Cluster.MainnetBeta],
        name: PROGRAM_NAMES.ACCOUNT_COMPRESSION,
    },
    cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.NFT_CANDY_MACHINE_V2,
    },
    cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.NFT_CANDY_MACHINE,
    },
    compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq: {
        deployments: [Cluster.MainnetBeta, Cluster.Devnet],
        name: PROGRAM_NAMES.ZK_ACCOUNT_COMPRESSION_PROGRAM,
    },
    [PYTH_ORACLE_PROGRAM_IDS.devnet]: {
        deployments: [Cluster.Devnet],
        name: PYTH_ORACLE_PROGRAM_LABEL,
    },
    [MANGO_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: MANGO_V3_PROGRAM_LABEL,
    },
    metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.TOKEN_METADATA,
    },
    namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.NAME,
    },
    oreV2ZymfyeXgNgBdqMkumTqqAprVqgBWQfoYkrtKWQ: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.ORE,
    },
    [OPEN_BOOK_PROGRAM_IDS.mainnet]: {
        deployments: [Cluster.MainnetBeta],
        name: OPENBOOK_DEX_PROGRAM_LABEL,
    },
    vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn: {
        deployments: LIVE_CLUSTERS,
        name: PROGRAM_NAMES.TOKEN_VAULT,
    },
    worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.WORMHOLE_CORE,
    },
    wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb: {
        deployments: [Cluster.MainnetBeta],
        name: PROGRAM_NAMES.WORMHOLE_TOKEN,
    },
};

export const SPECIAL_IDS: { [key: string]: string } = {
    '1nc1nerator11111111111111111111111111111111': 'Incinerator',
    Sysvar1111111111111111111111111111111111111: 'SYSVAR',
};

export const SYSVAR_IDS: { [key: string]: string } = {
    Sysvar1nstructions1111111111111111111111111: 'Sysvar: Instructions',
    SysvarC1ock11111111111111111111111111111111: 'Sysvar: Clock',
    SysvarEpochSchedu1e111111111111111111111111: 'Sysvar: Epoch Schedule',
    SysvarFees111111111111111111111111111111111: 'Sysvar: Fees',
    SysvarRecentB1ockHashes11111111111111111111: 'Sysvar: Recent Blockhashes',
    SysvarRent111111111111111111111111111111111: 'Sysvar: Rent',
    SysvarRewards111111111111111111111111111111: 'Sysvar: Rewards',
    SysvarS1otHashes111111111111111111111111111: 'Sysvar: Slot Hashes',
    SysvarS1otHistory11111111111111111111111111: 'Sysvar: Slot History',
    SysvarStakeHistory1111111111111111111111111: 'Sysvar: Stake History',
};

export const TOKEN_IDS: { [key: string]: string } = {
    [TOKEN_2022_PROGRAM_ADDRESS]: 'Token-2022 Program',
    [TOKEN_PROGRAM_ADDRESS]: 'Token Program',
} as const;

// Cluster-agnostic name lookup; the /mcp resolver injects this and has no per-cluster context (see app/mcp/dependencies.ts).
export function programNameByAddress(address: string): string | undefined {
    return PROGRAM_INFO_BY_ID[address]?.name ?? LOADER_IDS[address];
}
