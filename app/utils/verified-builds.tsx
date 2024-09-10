import { sha256 } from '@noble/hashes/sha256';
import { PublicKey } from '@solana/web3.js';
import useSWRImmutable from 'swr/immutable';

import { ProgramDataAccountInfo } from '../validators/accounts/upgradeable-program';

const OSEC_REGISTRY_URL = 'https://verify.osec.io';

export type OsecRegistryInfo = {
    is_verified: boolean;
    message: string;
    on_chain_hash: string;
    executable_hash: string;
    last_verified_at: string | null;
    repo_url: string;
};

export type CheckedOsecRegistryInfo = {
    explorer_hash: string;
};

export function useVerifiedProgramRegistry({
    programId,
    options,
}: {
    programId: PublicKey;
    options?: { suspense: boolean };
}) {
    const { data, error, isLoading } = useSWRImmutable(
        `${programId.toBase58()}`,
        async (programId: string) => {
            return fetch(`${OSEC_REGISTRY_URL}/status/${programId}`).then(response => response.json());
        },
        { suspense: options?.suspense }
    );
    return { data: error ? null : (data as OsecRegistryInfo), isLoading };
}

export function hashProgramData(programData: ProgramDataAccountInfo): string {
    const buffer = Buffer.from(programData.data[0], 'base64');
    // Truncate null bytes at the end of the buffer
    let truncatedBytes = 0;
    while (buffer[buffer.length - 1 - truncatedBytes] === 0) {
        truncatedBytes++;
    }
    // Hash the binary
    const c = Buffer.from(buffer.slice(0, buffer.length - truncatedBytes));
    return Buffer.from(sha256(c)).toString('hex');
}
