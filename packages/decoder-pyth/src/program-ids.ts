import { address } from '@solana/kit';

// The oracle is a C program with no IDL, so its instructions are named by table rather than by fetch.
export const PYTH_ORACLE_PROGRAM_IDS = {
    devnet: address('gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s'),
    mainnet: address('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH'),
    testnet: address('8tfDNiaEyrV6Q1U4DEXrEigs9DoDtkugzFbybENEbCDz'),
};

export const PYTH_PROGRAM_IDS = Object.values(PYTH_ORACLE_PROGRAM_IDS);

// Program display name for the app registry.
export const PYTH_ORACLE_PROGRAM_LABEL = 'Pyth Oracle Program';
