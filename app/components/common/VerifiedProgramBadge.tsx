import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';

import { useClusterPath } from '@/app/utils/url';
import { useVerifiedProgram } from '@/app/utils/verified-builds';
import { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

export function VerifiedProgramBadge({
    programData,
    pubkey,
}: {
    programData: ProgramDataAccountInfo;
    pubkey: PublicKey;
}) {
    const { isLoading, data: registryInfo } = useVerifiedProgram({
        programAuthority: programData.authority ? new PublicKey(programData.authority) : null,
        programData: programData,
        programId: pubkey,
    });
    const verifiedBuildTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/verified-build` });

    if (isLoading) {
        return (
            <h3 className="mb-0">
                <span className="badge">Loading...</span>
            </h3>
        );
    } else if (registryInfo) {
        let badgeClass = '';
        let badgeText = '';

        if (registryInfo.is_verified) {
            badgeClass = 'bg-success-soft';
            badgeText = 'Program Source Verified';
        } else {
            badgeClass = 'bg-warning-soft';
            badgeText = 'Not verified';
        }

        return (
            <h3 className="mb-0">
                <Link className={`c-pointer badge ${badgeClass} rank`} href={verifiedBuildTabPath}>
                    {badgeText}
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
