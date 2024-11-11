import { PublicKey } from '@solana/web3.js';

import { useVerifiedProgramRegistry, VerificationStatus } from '@/app/utils/verified-builds';
import { ProgramDataAccountInfo } from '@/app/validators/accounts/upgradeable-program';

export function VerifiedProgramBadge({
    programData,
    pubkey,
}: {
    programData: ProgramDataAccountInfo;
    pubkey: PublicKey;
}) {
    const { isLoading, data: registryInfo } = useVerifiedProgramRegistry({
        programAuthority: programData.authority ? new PublicKey(programData.authority) : null,
        programData: programData,
        programId: pubkey,
    });

    if (isLoading) {
        return (
            <h3 className="mb-0">
                <span className="badge">Loading...</span>
            </h3>
        );
    } else if (registryInfo) {
        let badgeClass = '';
        let badgeText = '';

        switch (registryInfo.verification_status) {
            case VerificationStatus.OsecVerified:
                badgeClass = 'bg-success-soft';
                badgeText = VerificationStatus.OsecVerified;
                break;
            case VerificationStatus.SelfVerified:
                badgeClass = 'bg-warning-soft';
                badgeText = VerificationStatus.SelfVerified;
                break;
            case VerificationStatus.NotVerified:
                badgeClass = 'bg-danger-soft';
                badgeText = VerificationStatus.NotVerified;
                break;
        }

        return (
            <h3 className="mb-0">
                <span className={`badge ${badgeClass}`}>{badgeText}</span>
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
