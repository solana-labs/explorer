import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '@solana-program/compute-budget';
import { MEMO_PROGRAM_ADDRESS } from '@solana-program/memo';
import { STAKE_PROGRAM_ADDRESS } from '@solana-program/stake';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

import { LOADER_IDS, ZK_ELGAMAL_PROOF_PROGRAM_ID } from '@/app/utils/programs';

// Programs that definitionally have no Anchor IDL. Skip the IDL PDA lookup so we don't depend on the
// RPC returning `null` for it — some RPCs return transient errors instead, which used to Sentry-panic
// on every transaction touching a builtin. Curated behavioral list, not the
// `@/app/utils/programs` display registry: reuse canonical exports where they exist, literals otherwise.
export const NON_ANCHOR_PROGRAMS = new Set<string>([
    SYSTEM_PROGRAM_ADDRESS,
    TOKEN_PROGRAM_ADDRESS,
    TOKEN_2022_PROGRAM_ADDRESS,
    COMPUTE_BUDGET_PROGRAM_ADDRESS,
    MEMO_PROGRAM_ADDRESS, // v2
    STAKE_PROGRAM_ADDRESS,
    ZK_ELGAMAL_PROOF_PROGRAM_ID,
    ...Object.keys(LOADER_IDS), // BPF loaders, Move loader, Native loader
    // No canonical export for these — kept as local literals:
    'AddressLookupTab1e1111111111111111111111111',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // SPL Associated Token Account
    'Config1111111111111111111111111111111111111',
    'Ed25519SigVerify111111111111111111111111111',
    'KeccakSecp256k11111111111111111111111111111',
    'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo', // SPL Memo v1
    'Vote111111111111111111111111111111111111111',
    'ZkTokenProof1111111111111111111111111111111',
]);
