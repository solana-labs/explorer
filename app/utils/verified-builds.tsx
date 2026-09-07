import { useAnchorProgram } from '@entities/idl';
import { hashProgramBytes, orderVerifiedEntries, TRUSTED_SIGNERS } from '@explorer/entity-inspector/verification';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useMemo } from 'react';
import { array, boolean, create, Infer, nullable, string, type } from 'superstruct';
import useSWRImmutable from 'swr/immutable';

import { fromBase64, fromUtf8 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

import { useCluster } from '../providers/cluster';
import { ProgramBufferAccountInfo, ProgramDataAccountInfo } from '../validators/accounts/upgradeable-program';
import { Cluster } from './cluster';
import { composeOnchainRepoUrl, normalizeRepoUrl, safeRepoUrl } from './verified-builds-url';

const OSEC_REGISTRY_URL = 'https://verify.osec.io';
const OSEC_DEVNET_REGISTRY_URL = 'https://verify-devnet.osec.io';
const VERIFY_PROGRAM_ID = 'verifycLy8mB96wd9wqq3WDXQwM4oU6r42Th37Db9fC';

export function supportsVerifiedBuilds(cluster: Cluster): boolean {
    return getOsecRegistryUrl(cluster) !== undefined;
}

// OSEC hosts a separate verified-builds registry per cluster; Testnet/Custom/SIMD-296 have none.
export function getOsecRegistryUrl(cluster: Cluster): string | undefined {
    switch (cluster) {
        case Cluster.MainnetBeta:
            return OSEC_REGISTRY_URL;
        case Cluster.Devnet:
            return OSEC_DEVNET_REGISTRY_URL;
        default:
            return undefined;
    }
}

export enum VerificationStatus {
    Verified = 'Verified Build',
    PdaUploaded = 'Not verified Build',
    NotVerified = 'Not Verified',
}

export type OsecRegistryInfo = {
    verification_status: VerificationStatus;
    signer: string;
    is_verified: boolean;
    message: string;
    on_chain_hash: string;
    executable_hash: string;
    last_verified_at: string | null;
    repo_url: string;
    onchain_repo_url: string;
    verify_command: string;
};

export type OsecInfo = {
    signer: string;
    is_verified: boolean;
    on_chain_hash: string;
    executable_hash: string;
    repo_url: string;
    commit: string;
    last_verified_at: string;
    is_frozen: boolean;
};

// A single completed build returned by the OSEC `/resolve-hash/{executable_hash}` endpoint.
// Each build is a source repo/commit whose compiled output hashes to the queried executable hash.
// Validated at the fetch boundary, so a field the API drops or retypes surfaces as an error state
// instead of rendering `undefined` in the table. `type` is lenient about unknown keys, so fields
// added upstream do not break the card.
export type OsecBuild = Infer<typeof OsecBuild>;
export const OsecBuild = type({
    build_id: string(),
    commit: string(),
    completed_at: string(),
    // Whether this build's hash is what is currently deployed on its `program_id`.
    matches_deployed: boolean(),
    program_id: string(),
    repository: string(),
    signer: nullable(string()),
    // Whether the build's signer is a trusted signer.
    trusted: boolean(),
});

// Response shape of `GET /resolve-hash/{executable_hash}`.
export type OsecResolveHashResponse = Infer<typeof OsecResolveHashResponse>;
export const OsecResolveHashResponse = type({
    builds: array(OsecBuild),
    executable_hash: string(),
});

// Decoded subset of the Otter Verify `BuildParams` account used to compose the verify command / repo URL.
type OtterVerifyBuildParams = {
    gitUrl: string;
    commit: string;
    args?: string[];
};

function parsePublicKey(value: string | undefined): PublicKey | null {
    if (!value) return null;
    try {
        return new PublicKey(value);
    } catch {
        return null;
    }
}

export function useVerifiedProgramRegistry({
    programId,
    programAuthority,
    options,
    programData,
}: {
    programId: PublicKey;
    programAuthority: PublicKey | null;
    options?: { suspense: boolean };
    programData?: ProgramDataAccountInfo;
}) {
    const { cluster } = useCluster();
    const registryUrl = getOsecRegistryUrl(cluster);
    const {
        data: registryData,
        error: registryError,
        isLoading: isRegistryLoading,
    } = useSWRImmutable(
        // The registry URL is part of the key so Mainnet and Devnet never share an entry.
        registryUrl ? ['status-all', registryUrl, programId.toBase58()] : null,
        async ([_prefix, base, id]) => {
            const response = await fetch(`${base}/status-all/${id}`);

            return response.json() as Promise<OsecInfo[]>;
        },
        { suspense: options?.suspense },
    );

    if (!programData || !registryData) {
        return { data: null, error: registryError, isLoading: isRegistryLoading };
    }

    // Only trust entries that are verified and signed by a trusted signer or the program authority.
    // Filtering, local re-validation, and hierarchy ordering are the shared verification core.
    let orderedVerifiedEntries: OsecInfo[] = [];
    if (programAuthority) {
        orderedVerifiedEntries = orderVerifiedEntries(
            registryData,
            programAuthority.toBase58(),
            hashProgramData(programData),
        );
    } else {
        // Program is immutable (no authority) — trust verified entries from
        // frozen programs or trusted signers. Since immutable programs cannot
        // be changed, verification from any trusted source remains valid.
        const trustedEntries = registryData.filter(
            entry => entry.is_verified && (entry.is_frozen || TRUSTED_SIGNERS[entry.signer]),
        );

        // Re-validate against on-chain data since the registry's is_verified flag may be stale
        const hash = hashProgramData(programData);
        orderedVerifiedEntries = trustedEntries
            .map(entry => ({ ...entry, is_verified: hash === entry['on_chain_hash'] }))
            .filter(entry => entry.is_verified)
            .sort((a, b) => new Date(a.last_verified_at).getTime() - new Date(b.last_verified_at).getTime());
    }

    return { data: orderedVerifiedEntries, isLoading: isRegistryLoading };
}

export function useIsProgramVerified({
    programId,
    programData,
}: {
    programId: PublicKey;
    programData: ProgramDataAccountInfo;
}) {
    const { cluster } = useCluster();
    const registryUrl = getOsecRegistryUrl(cluster);
    return useSWRImmutable(
        registryUrl
            ? [
                  'is-program-verified',
                  registryUrl,
                  programId.toBase58(),
                  hashProgramData(programData),
                  programData.authority,
              ]
            : null,
        async ([_prefix, base, programId, hash]) => {
            if (!programId) {
                return false;
            }

            const response = await fetch(`${base}/status/${programId}`);
            const osecInfo = (await response.json()) as OsecInfo;

            // Cross-check the on-chain hash to stay consistent with useVerifiedProgramRegistry
            return osecInfo.is_verified && hash === osecInfo['on_chain_hash'];
        },
    );
}

// Resolve the completed builds whose compiled output matches a given executable hash.
// Used for program buffer accounts: a buffer holds a staged binary with no program id to look
// up in the OSEC registry, but its buffer hash can still be resolved to the source build(s)
// that produced it. Returns the `/resolve-hash` response, or nothing while `hash` is undefined
// (e.g. a buffer whose `data` is unavailable, so no hash could be computed) or the cluster has
// no registry. The registry URL is part of the cache key, so clusters never share an entry.
export function useResolveBuildsByHash(hash: string | undefined) {
    const { cluster } = useCluster();
    const registryUrl = getOsecRegistryUrl(cluster);
    return useSWRImmutable(
        hash && registryUrl ? ['resolve-hash', registryUrl, hash] : null,
        async ([, base, executableHash]) => {
            const response = await fetch(`${base}/resolve-hash/${executableHash}`);
            if (!response.ok) {
                throw new Error(`resolve-hash request failed with status ${response.status}`);
            }
            // `create` throws on a malformed payload; SWR surfaces it as the card's error state.
            return create(await response.json(), OsecResolveHashResponse);
        },
    );
}

// Collapse exact-duplicate builds and order them for display. `/resolve-hash` can return the same
// build several times (e.g. re-runs); it can also return genuinely distinct entries that share a
// program/repo/commit but differ in trust or deploy match, which we keep as separate rows. Ordered
// most-relevant first: trusted, then matching the deployed program, then most recently completed.
export function dedupeAndSortBuilds(builds: OsecBuild[]): OsecBuild[] {
    const seen = new Set<string>();
    // Sort newest-first before de-duping so the entry kept for each duplicate group is the most
    // recent run — the filter keeps the first occurrence, so this is independent of the order
    // `/resolve-hash` returned the builds in.
    const deduped = [...builds]
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .filter(build => {
            const key = `${build.program_id}|${build.repository}|${build.commit}|${build.trusted}|${build.matches_deployed}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

    return deduped.sort((a, b) => {
        if (a.trusted !== b.trusted) return a.trusted ? -1 : 1;
        if (a.matches_deployed !== b.matches_deployed) return a.matches_deployed ? -1 : 1;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    });
}

// Method to fetch verified build information for a given program
// Returns the first verified entry that is signed by the program authority or a trusted signer
export function useVerifiedProgram({
    programId,
    programAuthority,
    options,
    programData,
}: {
    programId: PublicKey;
    programAuthority: PublicKey | null;
    options?: { suspense: boolean };
    programData?: ProgramDataAccountInfo;
}) {
    const { data: orderedVerifiedEntries, isLoading: isRegistryLoading } = useVerifiedProgramRegistry({
        options,
        programAuthority,
        programData,
        programId,
    });

    // Get the first verified entry
    const verifiedData = orderedVerifiedEntries?.find(entry => entry.is_verified);

    const enriched = useEnrichedOsecInfo({ options, osecInfo: verifiedData, programAuthority, programId });

    // Keep surfacing the loading state while the registry (`/status-all`) is still in flight, so the card
    // renders a spinner instead of prematurely falling through to the "not uploaded" empty state.
    return { ...enriched, isLoading: isRegistryLoading || enriched.isLoading };
}

// Internal method to enrich the osec info with the verify command (requires fetching the on-chain PDA)
function useEnrichedOsecInfo({
    programId,
    osecInfo,
    options,
    programAuthority,
}: {
    programId: PublicKey;
    osecInfo: OsecInfo | undefined;
    options?: { suspense: boolean };
    programAuthority: PublicKey | null;
}) {
    const { url: clusterUrl, cluster: cluster } = useCluster();

    const { program: accountAnchorProgram, isLoading: isIdlLoading } = useAnchorProgram(
        VERIFY_PROGRAM_ID,
        clusterUrl,
        cluster,
    );
    const signerAuthorities = useMemo(
        () =>
            Array.from(
                new Map(
                    [
                        programAuthority,
                        parsePublicKey(osecInfo?.signer),
                        ...Object.keys(TRUSTED_SIGNERS).map(parsePublicKey),
                    ]
                        .filter((key): key is PublicKey => key !== null)
                        .map(key => [key.toBase58(), key]),
                ).values(),
            ),
        [programAuthority, osecInfo?.signer],
    );

    // Fetch the PDA derived from the program upgrade authority
    const {
        data: pdaData,
        error: pdaError,
        isLoading: isPdaLoading,
    } = useSWRImmutable(
        // Scope the key by RPC endpoint: the PDA is an on-chain account that differs per cluster, and
        // useSWRImmutable never revalidates — without this, switching Mainnet<->Devnet would reuse the
        // other cluster's PDA and pair it with the wrong -um/-ud verify command.
        accountAnchorProgram && osecInfo && signerAuthorities.length > 0
            ? `pda-${clusterUrl}-${programId.toBase58()}-${signerAuthorities.map(x => x.toBase58()).join(',')}`
            : null,
        async () => {
            if (!osecInfo || !accountAnchorProgram) {
                return null;
            }

            for (const pdaSeedAuthority of signerAuthorities) {
                const [pda] = PublicKey.findProgramAddressSync(
                    [fromUtf8('otter_verify'), pdaSeedAuthority.toBytes(), programId.toBytes()],
                    new PublicKey(VERIFY_PROGRAM_ID),
                );
                try {
                    const pdaAccountInfo = await (accountAnchorProgram.account as any).buildParams.fetch(pda);
                    if (pdaAccountInfo) {
                        return pdaAccountInfo;
                    }
                } catch (error: unknown) {
                    // Expected: most signer candidates won't have a matching PDA
                    Logger.debug('[utils:verified-builds] No matching PDA for signer candidate', {
                        error,
                    });
                }
            }
            return null;
        },
        { suspense: options?.suspense },
    );

    // A propagated `pdaError` means the PDA fetch threw unexpectedly — the expected "no matching PDA"
    // case is caught per-candidate inside the fetcher and returns `null`. Log it so the degrade to
    // OSEC-only data isn't silent before we coalesce it away to `null` below.
    useEffect(() => {
        if (pdaError) {
            Logger.error(pdaError, { programId: programId.toBase58() });
        }
    }, [pdaError, programId]);

    // No verified entry from the registry — surface nothing so the card shows the empty state.
    if (!osecInfo) {
        return { data: null, isLoading: false };
    }

    // The Otter Verify PDA — and the verify-program IDL needed to decode it — only enrich the card with
    // the verify command and on-chain repo URL; they are NOT required to know the program is verified
    // (OSEC + the on-chain hash re-check already establish that). Stay in the loading state while that
    // resolution is in flight so a verified program never flashes the "not uploaded" empty state, then
    // render from OSEC data whether or not the PDA resolved. A `pdaError` (logged above) degrades to the
    // same "no PDA" render path.
    if (isIdlLoading || isPdaLoading) {
        return { data: null, isLoading: true };
    }

    return {
        data: buildEnrichedOsecInfo({ cluster, osecInfo, pdaData: pdaError ? null : (pdaData ?? null), programId }),
        isLoading: false,
    };
}

// Build the display model from the OSEC registry entry, enriching with the on-chain Otter Verify PDA
// when available. The PDA supplies the verify command and on-chain repo URL; without it we fall back to
// the OSEC-reported repo URL and a placeholder command so a verified program still renders its status.
export function buildEnrichedOsecInfo({
    cluster,
    programId,
    osecInfo,
    pdaData,
}: {
    cluster: Cluster;
    programId: PublicKey;
    osecInfo: OsecInfo;
    pdaData: OtterVerifyBuildParams | null;
}): OsecRegistryInfo {
    const message = TRUSTED_SIGNERS[osecInfo.signer]
        ? 'Verification information provided by a trusted signer.'
        : osecInfo.is_frozen
          ? 'Verification information provided by the program deployer.'
          : 'Verification information provided by the program authority.';

    const { repo_url, signer, is_verified, ...rest } = osecInfo;
    const osecRepoUrl = safeRepoUrl(normalizeRepoUrl(repo_url)) ?? '';

    return {
        ...rest,
        is_verified,
        message,
        onchain_repo_url: pdaData
            ? (composeOnchainRepoUrl(pdaData.gitUrl, pdaData.commit) ?? osecRepoUrl)
            : osecRepoUrl,
        repo_url: osecRepoUrl,
        signer: signer || '',
        verification_status: is_verified
            ? VerificationStatus.Verified
            : pdaData
              ? VerificationStatus.PdaUploaded
              : VerificationStatus.NotVerified,
        verify_command: pdaData
            ? coalesceCommandFromPda(programId, pdaData, cluster)
            : supportsVerifiedBuilds(cluster)
              ? 'Program does not have a verify PDA uploaded.'
              : 'Verify command not available on this cluster.',
    };
}

function coalesceCommandFromPda(programId: PublicKey, pdaData: OtterVerifyBuildParams, cluster: Cluster) {
    // solana-verify targets a cluster with the URL moniker: -ud for Devnet, -um for Mainnet.
    const clusterFlag = cluster === Cluster.Devnet ? '-ud' : '-um';
    let verify_command = `solana-verify verify-from-repo ${clusterFlag} --program-id ${programId.toBase58()} ${pdaData.gitUrl}`;

    if (pdaData.commit) {
        verify_command += ` --commit-hash ${pdaData.commit}`;
    }

    // Add additional args if available, for example mount-path and --library-name
    if (pdaData.args && pdaData.args.length > 0) {
        const argsString = pdaData.args.join(' ');
        verify_command += ` ${argsString}`;
    }
    return verify_command;
}

// Helper function to hash program data
/**
 * Compute the solana-verify-style hash of an upgradeable BPF loader buffer account,
 * matching `solana-verify get-buffer-hash` / `get_binary_hash`: sha256 of the program
 * bytes with trailing zero padding removed. The RPC's jsonParsed buffer `data` is already
 * the bytes past the 37-byte buffer header. Returns undefined when `data` is unavailable.
 */
export function hashProgramBuffer(buffer: ProgramBufferAccountInfo): string | undefined {
    if (!buffer.data) return undefined;
    const bytes = fromBase64(buffer.data[0]);
    // Same RPC quirk as hashProgramData: when authority is None the parsed `data` carries the
    // 32-byte pubkey from the (Option) header, so skip it to match solana-verify's raw offset.
    const offset = buffer.authority === null ? 32 : 0;
    return hashProgramBytes(bytes.slice(offset));
}

export function hashProgramData(programData: ProgramDataAccountInfo): string {
    const buffer = fromBase64(programData.data[0]);
    // The jsonParsed RPC response includes the 32-byte pubkey field from the raw
    // account header when authority is None (may contain stale data from a previous
    // authority). Skip them so the hash matches what solana-verify computes from
    // raw account data at the fixed 45-byte offset.
    const offset = programData.authority === null ? 32 : 0;
    return hashProgramBytes(buffer.slice(offset));
}
