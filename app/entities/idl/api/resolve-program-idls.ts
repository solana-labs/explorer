import { fetchLatestIdls, fetchPmpIdl, parseIdl } from '@solana/idl';
import { type Address, type Rpc, type SolanaRpcApi } from '@solana/kit';

import { NON_ANCHOR_PROGRAMS } from './config';
import { type ProgramIdlSources } from './types';

// `createSolanaRpc(url)` produces this; the @solana/idl helpers accept its narrower `SolanaRpcClient`.
type IdlRpc = Rpc<SolanaRpcApi>;

/**
 * Resolver output: both IDL sources as parsed-but-not-yet-standard-narrowed JSON (`unknown`), each with
 * its on-chain storage account. Consumers narrow to `SupportedIdl` downstream (`ProgramIdlPair`).
 */
export type ResolvedProgramIdls = ProgramIdlSources<unknown>;

/**
 * Resolve a program's Anchor + PMP `idl`-seed IDLs, backed by `@solana/idl`. Shared by the
 * `/api/idl-latest` route (server) and the custom/localhost client resolver, so known and custom
 * clusters resolve identically. Both sources are always resolved; each consumer reads the field it
 * needs (`anchorIdl` / `programMetadataIdl`).
 *
 * Both come from `fetchLatestIdls` — the package's own `GET /api/latest` resolver (PMP canonical →
 * fndn fallback, Anchor PDA, side by side). Native/builtin programs skip the Anchor leg (PMP only via
 * `fetchPmpIdl`): they can't have an Anchor IDL and some RPCs throw, instead of returning absent, for the
 * derived PDA (see NON_ANCHOR_PROGRAMS).
 *
 * Every `@solana/idl` fetcher surfaces absent/undecodable as a value and throws **only on RPC
 * failure**, so a blip propagates to the caller (retryable 502 / SWR retry) and is never cached as a
 * false-negative "no IDLs".
 */
export async function resolveProgramIdls(rpc: IdlRpc, programId: Address): Promise<ResolvedProgramIdls> {
    // Native/builtin programs can't have an Anchor IDL — skip the PDA lookup (see NON_ANCHOR_PROGRAMS);
    // some RPCs even throw for the derived PDA, so we must not attempt it.
    const resolveAnchor = !NON_ANCHOR_PROGRAMS.has(programId);

    let anchorContent: string | undefined;
    let pmpContent: string | undefined;
    // The IDL storage accounts the content was read from (derived PDAs / resolved PMP account).
    let anchorAccount: string | undefined;
    let pmpAccount: string | undefined;
    if (resolveAnchor) {
        // The package's side-by-side resolver (one round trip per source).
        const { anchor, pmp, anchorAddress, pmpAddress } = await fetchLatestIdls(rpc, programId);
        anchorContent = anchor[0]?.content;
        pmpContent = pmp[0]?.content;
        anchorAccount = anchorAddress;
        pmpAccount = pmpAddress;
    } else {
        // Native program: PMP only (no Anchor PDA).
        const result = await fetchPmpIdl(rpc, programId);
        if (result.status === 'ok') {
            pmpContent = result.content;
            pmpAccount = result.address;
        }
    }

    // No IDL-shape check: both sources parse only to a JSON object. PMP content may be Anchor-format or
    // Codama (whose `instructions` nest under `program`), so no single shape holds — format detection is
    // the client's job, and the Anchor tx-decoder (`useAnchorProgram`) guards itself.
    const anchorIdl = parseContent(anchorContent);
    const programMetadataIdl = parseContent(pmpContent);
    return {
        anchorIdl,
        // Only surface a storage account for a source that resolved to a usable (parsed) IDL.
        anchorIdlAddress: anchorIdl ? anchorAccount : undefined,
        programMetadataIdl,
        programMetadataIdlAddress: programMetadataIdl ? pmpAccount : undefined,
    };
}

/** Parse fetched IDL content to a JSON object, or `undefined` (absent / not JSON / not an object). */
function parseContent(content?: string): unknown {
    if (!content) return undefined;
    const result = parseIdl(content);
    return result.ok ? result.idl : undefined;
}
