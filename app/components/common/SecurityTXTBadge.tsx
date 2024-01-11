import { PublicKey } from '@solana/web3.js';
import { fromProgramData } from '@utils/security-txt';
import { useClusterPath } from '@utils/url';
import { ProgramDataAccountInfo } from '@validators/accounts/upgradeable-program';
import Link from 'next/link';

export function SecurityTXTBadge({ programData, pubkey }: { programData: ProgramDataAccountInfo; pubkey: PublicKey }) {
    const { securityTXT, error } = fromProgramData(programData);
    const securityTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/security` });
    if (securityTXT) {
        return (
            <h3 className="mb-0">
                <Link className="c-pointer badge bg-success-soft rank" href={securityTabPath}>
                    Included
                </Link>
            </h3>
        );
    } else {
        return (
            <h3 className="mb-0">
                <span className="badge bg-warning-soft rank">{error}</span>
            </h3>
        );
    }
}
