// Programs that definitionally have no Anchor IDL. Skipping their IDL-PDA lookup is not just a saved
// read: it removes a dependency on the RPC answering `null` for the derived address, and some answer a
// transient error instead — which would turn "no IDL" into a retryable failure on every transaction
// touching a builtin. Behavioural list, not a display registry.
import {
    ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
    BPF_LOADER_2_PROGRAM_ID,
    BPF_LOADER_PROGRAM_ID,
    BPF_UPGRADEABLE_LOADER_PROGRAM_ID,
    FEATURE_PROGRAM_ID,
    LOADER_V4_PROGRAM_ID,
    NATIVE_LOADER_PROGRAM_ID,
    SYSTEM_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    VOTE_PROGRAM_ID,
} from '../shared/constants.js';

/**
 * Same intent as the app's `NON_ANCHOR_PROGRAMS`, kept separately because the inspector must not import
 * app code. Loaders belong here: a deploy or upgrade instruction's `program_id` IS the loader, so every
 * such transaction would otherwise trigger the lookup. Native or BPF is irrelevant — Token, Token-2022,
 * ATA and Memo are BPF-deployed yet publish no Anchor IDL, so don't prune this to "native programs".
 */
export const PROGRAMS_WITHOUT_ANCHOR_IDL: ReadonlySet<string> = new Set([
    ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
    BPF_LOADER_2_PROGRAM_ID,
    BPF_LOADER_PROGRAM_ID,
    BPF_UPGRADEABLE_LOADER_PROGRAM_ID,
    FEATURE_PROGRAM_ID,
    LOADER_V4_PROGRAM_ID,
    NATIVE_LOADER_PROGRAM_ID,
    SYSTEM_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    VOTE_PROGRAM_ID,
    // no client dependency carries these — literals, as in `shared/constants.ts`
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // SPL Associated Token Account
    'ComputeBudget111111111111111111111111111111',
    'Config1111111111111111111111111111111111111',
    'Ed25519SigVerify111111111111111111111111111',
    'KeccakSecp256k11111111111111111111111111111',
    'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo', // SPL Memo v1
    'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', // SPL Memo v2
    'Stake11111111111111111111111111111111111111',
    'ZkE1Gama1Proof11111111111111111111111111111',
    'ZkTokenProof1111111111111111111111111111111',
]);
