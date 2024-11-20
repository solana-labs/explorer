import { sha256 } from '@noble/hashes/sha256';
import { Connection, PublicKey } from '@solana/web3.js';
import useSWRImmutable from 'swr/immutable';

import { useAnchorProgram } from '../providers/anchor';
import { useCluster } from '../providers/cluster';
import { ProgramDataAccountInfo } from '../validators/accounts/upgradeable-program';
import { Cluster } from './cluster';

const OSEC_REGISTRY_URL = 'https://verify.osec.io';
const VERIFY_PROGRAM_ID = 'verifycLy8mB96wd9wqq3WDXQwM4oU6r42Th37Db9fC';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export enum VerificationStatus {
    Verified = 'Verified Build',
    PdaUploaded = 'Not verified Build',
    NotVerified = 'Not Verified',
}

export type OsecRegistryInfo = {
    verification_status: VerificationStatus;
    is_verified: boolean;
    message: string;
    on_chain_hash: string;
    executable_hash: string;
    last_verified_at: string | null;
    repo_url: string;
    verify_command: string;
};

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
    const { url: clusterUrl, cluster: cluster } = useCluster();
    const connection = new Connection(clusterUrl);

    const {
        data: registryData,
        error: registryError,
        isLoading: isRegistryLoading,
    } = useSWRImmutable(
        `${programId.toBase58()}`,
        async (programId: string) => {
            const response = await fetch(`${OSEC_REGISTRY_URL}/status/${programId}`);

            return response.json();
        },
        { suspense: options?.suspense }
    );

    if (programData && registryData) {
        const hash = hashProgramData(programData);
        registryData.verification_status =
            hash === registryData['on_chain_hash'] ? VerificationStatus.Verified : VerificationStatus.NotVerified;
    }

    const { program: accountAnchorProgram } = useAnchorProgram(VERIFY_PROGRAM_ID, connection.rpcEndpoint);

    // Fetch the PDA derived from the program upgrade authority
    // TODO: Add getting verifier pubkey from the security.txt as second option once implemented
    const {
        data: pdaData,
        error: pdaError,
        isLoading: isPdaLoading,
    } = useSWRImmutable(
        programAuthority && accountAnchorProgram ? `pda-${programId.toBase58()}` : null,
        async () => {
            if (!programAuthority) {
                console.log('Program authority not defined');
                return null;
            }
            const [pda] = PublicKey.findProgramAddressSync(
                [Buffer.from('otter_verify'), programAuthority.toBuffer(), programId.toBuffer()],
                new PublicKey(VERIFY_PROGRAM_ID)
            );
            const pdaAccountInfo = await connection.getAccountInfo(pda);
            if (!pdaAccountInfo || !pdaAccountInfo.data) {
                console.log('PDA account info not found');
                return null;
            }
            return accountAnchorProgram?.coder.accounts.decode('buildParams', pdaAccountInfo.data);
        },
        { suspense: options?.suspense }
    );

    const isLoading = isRegistryLoading || isPdaLoading;

    if (registryError || pdaError) {
        return { data: null, error: registryError || pdaError, isLoading };
    }

    // Create command from the args of the verify PDA
    if (registryData && pdaData && !isLoading) {
        const verifiedData = registryData as OsecRegistryInfo;
        verifiedData.verify_command = `solana-verify verify-from-repo -um --program-id ${programId.toBase58()} ${
            pdaData.gitUrl
        }`;

        if (pdaData.commit) {
            verifiedData.verify_command += ` --commit-hash ${pdaData.commit}`;
        }

        // Add additional args if available, for example mount-path and --library-name
        if (pdaData.args && pdaData.args.length > 0) {
            const filteredArgs = [];

            for (let i = 0; i < pdaData.args.length; i++) {
                const arg = pdaData.args[i];

                if (arg === '-b' || arg === '--base-image') {
                    i++; // Also skip the parameter
                    continue;
                }
                filteredArgs.push(arg);
            }

            if (filteredArgs.length > 0) {
                const argsString = filteredArgs.join(' ');
                verifiedData.verify_command += ` ${argsString}`;
            }
        }
        verifiedData.repo_url = pdaData.gitUrl;
        if (registryData.verification_status === VerificationStatus.NotVerified) {
            verifiedData.message = 'Verify command was provided by the program authority.';
            verifiedData.verification_status = VerificationStatus.PdaUploaded;
        }
        return { data: verifiedData, isLoading };
    }
    if (registryData && pdaData == null && !isLoading) {
        const verifiedData = registryData as OsecRegistryInfo;

        verifiedData.verify_command = isMainnet(cluster)
            ? 'Program does not have a verify PDA uploaded.'
            : 'Verify command only available on mainnet.';
        return { data: verifiedData, isLoading };
    }

    return { data: null, isLoading };
}

function isMainnet(currentCluster: Cluster): boolean {
    return currentCluster == Cluster.MainnetBeta;
}

// Helper function to hash program data
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
