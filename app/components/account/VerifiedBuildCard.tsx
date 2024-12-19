import { ErrorCard } from '@components/common/ErrorCard';
import { TableCardBody } from '@components/common/TableCardBody';
import { UpgradeableLoaderAccountData } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { ExternalLink } from 'react-feather';

import { OsecRegistryInfo, useVerifiedProgram, VerificationStatus } from '@/app/utils/verified-builds';

import { Address } from '../common/Address';
import { Copyable } from '../common/Copyable';
import { LoadingCard } from '../common/LoadingCard';

export function VerifiedBuildCard({ data, pubkey }: { data: UpgradeableLoaderAccountData; pubkey: PublicKey }) {
    const { data: registryInfo, isLoading } = useVerifiedProgram({
        options: { suspense: true },
        programAuthority: data.programData?.authority ? new PublicKey(data.programData.authority) : null,
        programData: data.programData,
        programId: pubkey,
    });
    if (!data.programData) {
        return <ErrorCard text="Account has no data" />;
    }

    if (isLoading) {
        return <LoadingCard message="Fetching last verified build hash" />;
    }

    if (!registryInfo) {
        return (
            <div className="card">
                <div className="card-body text-center">
                    Verified build information not yet uploaded by program authority. For more information, see the{' '}
                    <Link href="https://solana.com/developers/guides/advanced/verified-builds" target="_blank">
                        Verified Build Guide
                    </Link>
                </div>
            </div>
        );
    }

    // Define the message based on the verification status
    let verificationMessage;
    if (
        registryInfo.verification_status === VerificationStatus.Verified ||
        registryInfo.verification_status === VerificationStatus.PdaUploaded
    ) {
        verificationMessage = 'Information provided by osec.io';
    } else if (registryInfo.verification_status === VerificationStatus.NotVerified) {
        verificationMessage = 'No verified build found';
    }

    return (
        <div className="card security-txt">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Verified Build</h3>
                <small>{verificationMessage}</small>
            </div>
            <div className="alert mt-2 mb-2">
                A verified build badge indicates that this program was built from source code that is publicly
                available, but does not imply that this program has been audited. For more details, refer to the{' '}
                <a
                    href="https://solana.com/developers/guides/advanced/verified-builds"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Verified Builds Guide <ExternalLink className="align-text-top ms-1" size={13} />
                </a>
                .
            </div>
            <TableCardBody>
                {ROWS.filter(x => x.key in registryInfo).map((x, idx) => {
                    return (
                        <tr key={idx}>
                            <td className="w-100">{x.display}</td>
                            <RenderEntry value={registryInfo[x.key]} type={x.type} />
                        </tr>
                    );
                })}
            </TableCardBody>
        </div>
    );
}

enum DisplayType {
    Boolean,
    String,
    URL,
    Date,
    LongString,
    PublicKey,
}

type TableRow = {
    display: string;
    key: keyof OsecRegistryInfo;
    type: DisplayType;
};

const ROWS: TableRow[] = [
    {
        display: 'Verified',
        key: 'is_verified',
        type: DisplayType.Boolean,
    },
    {
        display: 'Message',
        key: 'message',
        type: DisplayType.String,
    },
    {
        display: 'Uploader',
        key: 'signer',
        type: DisplayType.PublicKey,
    },
    {
        display: 'On Chain Hash',
        key: 'on_chain_hash',
        type: DisplayType.String,
    },
    {
        display: 'Executable Hash',
        key: 'executable_hash',
        type: DisplayType.String,
    },
    {
        display: 'Last Verified At',
        key: 'last_verified_at',
        type: DisplayType.Date,
    },
    {
        display: 'Verify Command',
        key: 'verify_command',
        type: DisplayType.LongString,
    },
    {
        display: 'Repository URL',
        key: 'repo_url',
        type: DisplayType.URL,
    },
];

function RenderEntry({ value, type }: { value: OsecRegistryInfo[keyof OsecRegistryInfo]; type: DisplayType }) {
    switch (type) {
        case DisplayType.Boolean:
            return (
                <td className={'text-lg-end font-monospace'}>
                    <span className={`badge bg-${value ? 'success' : 'warning'}-soft`}>{new String(value)}</span>
                </td>
            );
        case DisplayType.String:
            if (Object.values(VerificationStatus).includes(value as VerificationStatus)) {
                const badgeClass = value === VerificationStatus.Verified ? 'bg-success-soft' : 'bg-warning-soft';
                const badgeValue = value === VerificationStatus.Verified ? 'true' : 'false';
                return (
                    <td className="text-lg-end font-monospace">
                        <span className={`badge ${badgeClass}`}>{badgeValue}</span>
                    </td>
                );
            }
            return (
                <td className="text-lg-end font-monospace" style={{ whiteSpace: 'pre' }}>
                    {value && (value as string).length > 1 ? value : '-'}
                </td>
            );
        case DisplayType.LongString:
            return (
                <td
                    className="text-lg-end font-monospace"
                    style={{
                        overflowWrap: 'break-word',
                        position: 'relative',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                    }}
                >
                    {value && (value as string).length > 1 ? (
                        <>
                            <Copyable text={value as string}> </Copyable>
                            <span>{value}</span>
                        </>
                    ) : (
                        '-'
                    )}
                </td>
            );
        case DisplayType.URL:
            if (isValidLink(value as string)) {
                return (
                    <td className="text-lg-end">
                        <span className="font-monospace">
                            <a rel="noopener noreferrer" target="_blank" href={value as string}>
                                {value}
                                <ExternalLink className="align-text-top ms-2" size={13} />
                            </a>
                        </span>
                    </td>
                );
            }
            return (
                <td className="text-lg-end font-monospace">
                    {value && (value as string).length > 1 ? (value as string).trim() : '-'}
                </td>
            );
        case DisplayType.Date:
            return (
                <td className="text-lg-end font-monospace">
                    {value && (value as string).length > 1 ? new Date(value as string).toUTCString() : '-'}
                </td>
            );
        case DisplayType.PublicKey:
            return (
                <td className="text-lg-end font-monospace">
                    <Address pubkey={new PublicKey(value as string)} link alignRight />
                </td>
            );
        default:
            break;
    }
    return <></>;
}

function isValidLink(value: string) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch (err) {
        return false;
    }
}
