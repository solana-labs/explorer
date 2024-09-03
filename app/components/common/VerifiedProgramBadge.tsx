import { sha256 } from '@noble/hashes/sha256';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';
import useSWRImmutable from 'swr/immutable';

import { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

const OSEC_REGISTRY_URL = 'https://verify.osec.io';

function hashProgramData(programData: ProgramDataAccountInfo): string {
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

function useVerifiedProgram({ programId, options }: { programId: PublicKey; options?: { suspense: boolean } }) {
    const { data, error, isLoading } = useSWRImmutable(
        `${programId.toBase58()}`,
        async (programId: string) => {
            return fetch(`${OSEC_REGISTRY_URL}/status/${programId}`).then(response => response.json());
        },
        { suspense: options?.suspense }
    );
    return { data: error ? null : (data as OsecRegistryInfo), isLoading };
}

type OsecRegistryInfo = {
    is_verified: boolean;
    message: string;
    on_chain_hash: string;
    executable_hash: string;
    last_verified_at: string | null;
    repo_url: string;
};

export function VerifiedProgramBadge({
    programData,
    pubkey,
}: {
    programData: ProgramDataAccountInfo;
    pubkey: PublicKey;
}) {
    const { isLoading, data: registryInfo } = useVerifiedProgram({ programId: pubkey });
    const hash = hashProgramData(programData);
    if (isLoading) {
        return (
            <h3 className="mb-0">
                <span className="badge">Loading...</span>
            </h3>
        );
    } else if (registryInfo && hash === registryInfo['on_chain_hash'] && registryInfo['is_verified']) {
        return (
            <h3 className="mb-0">
                <Link
                    rel="noopener noreferrer"
                    target="_blank"
                    className="badge bg-success-soft rank"
                    href={registryInfo['repo_url']}
                >
                    Program Source Program Verified
                    <ExternalLink className="align-text-top ms-2" size={13} />
                </Link>
            </h3>
        );
    } else {
        const message =
            !registryInfo || !registryInfo['repo_url'] ? 'Source Code Not Provided' : 'Program Not Verified';
        return (
            <h3 className="mb-0">
                <span className="badge bg-warning-soft rank">{message}</span>
            </h3>
        );
    }
}
