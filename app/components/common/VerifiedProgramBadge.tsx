import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';

import { useClusterPath } from '@/app/utils/url';
import { hashProgramData, useVerifiedProgramRegistry } from '@/app/utils/verified-builds';
import { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

export function VerifiedProgramBadge({
    programData,
    pubkey,
}: {
    programData: ProgramDataAccountInfo;
    pubkey: PublicKey;
}) {
    const { isLoading, data: registryInfo } = useVerifiedProgramRegistry({ programAuthority: programData.authority ? new PublicKey(programData.authority) : null, programId: pubkey });
    const verifiedBuildTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/verified-build` });

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
                <Link className="badge bg-success-soft rank" href={verifiedBuildTabPath}>
                    Program Source Program Verified
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
