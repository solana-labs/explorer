import { UnknownAccountCard } from '@components/account/UnknownAccountCard';
import { Address } from '@components/common/Address';
import { DownloadableIcon } from '@components/common/Downloadable';
import { InfoTooltip } from '@components/common/InfoTooltip';
import { SecurityTXTBadge } from '@components/common/SecurityTXTBadge';
import { Slot } from '@components/common/Slot';
import { SolBalance } from '@components/common/SolBalance';
import { TableCardBody } from '@components/common/TableCardBody';
import { Account, useFetchAccountInfo } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { addressLabel } from '@utils/tx';
import {
    ProgramAccountInfo,
    ProgramBufferAccountInfo,
    ProgramDataAccountInfo,
    UpgradeableLoaderAccount,
} from '@validators/accounts/upgradeable-program';
import Link from 'next/link';
import React from 'react';
import { ExternalLink, RefreshCw } from 'react-feather';

import { useSquadsMultisigLookup } from '@/app/providers/squadsMultisig';
import { Cluster } from '@/app/utils/cluster';
import { useClusterPath } from '@/app/utils/url';

import { VerifiedProgramBadge } from '../common/VerifiedProgramBadge';

export function UpgradeableLoaderAccountSection({
    account,
    parsedData,
    programData,
}: {
    account: Account;
    parsedData: UpgradeableLoaderAccount;
    programData: ProgramDataAccountInfo | undefined;
}) {
    switch (parsedData.type) {
        case 'program': {
            return (
                <UpgradeableProgramSection
                    account={account}
                    programAccount={parsedData.info}
                    programData={programData}
                />
            );
        }
        case 'programData': {
            return <UpgradeableProgramDataSection account={account} programData={parsedData.info} />;
        }
        case 'buffer': {
            return <UpgradeableProgramBufferSection account={account} programBuffer={parsedData.info} />;
        }
        case 'uninitialized': {
            return <UnknownAccountCard account={account} />;
        }
    }
}

export function UpgradeableProgramSection({
    account,
    programAccount,
    programData,
}: {
    account: Account;
    programAccount: ProgramAccountInfo;
    programData: ProgramDataAccountInfo | undefined;
}) {
    const refresh = useFetchAccountInfo();
    const { cluster } = useCluster();
    const { data: squadMapInfo } = useSquadsMultisigLookup(programData?.authority, cluster);

    const label = addressLabel(account.pubkey.toBase58(), cluster);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">
                    {programData === undefined && 'Closed '}Program Account
                </h3>
                <button className="btn btn-white btn-sm" onClick={() => refresh(account.pubkey, 'parsed')}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                {label && (
                    <tr>
                        <td>Address Label</td>
                        <td className="text-lg-end">{label}</td>
                    </tr>
                )}
                <tr>
                    <td>Balance (ZUMA)</td>
                    <td className="text-lg-end text-uppercase">
                        <SolBalance lamports={account.lamports} />
                    </td>
                </tr>
                <tr>
                    <td>Executable</td>
                    <td className="text-lg-end">{programData !== undefined ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                    <td>Executable Data{programData === undefined && ' (Closed)'}</td>
                    <td className="text-lg-end">
                        <Address pubkey={programAccount.programData} alignRight link />
                    </td>
                </tr>
                {programData !== undefined && (
                    <>
                        <tr>
                            <td>Upgradeable</td>
                            <td className="text-lg-end">{programData.authority !== null ? 'Yes' : 'No'}</td>
                        </tr>
                        <tr>
                            <td>
                                <VerifiedLabel />
                            </td>
                            <td className="text-lg-end">
                                <VerifiedProgramBadge programData={programData} pubkey={account.pubkey} />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <SecurityLabel />
                            </td>
                            <td className="text-lg-end">
                                <SecurityTXTBadge programData={programData} pubkey={account.pubkey} />
                            </td>
                        </tr>
                        <tr>
                            <td>Last Deployed Slot</td>
                            <td className="text-lg-end">
                                <Slot slot={programData.slot} link />
                            </td>
                        </tr>
                        {programData.authority !== null && (
                            <>
                                <tr>
                                    <td>Upgrade Authority</td>
                                    <td className="text-lg-end">
                                        {cluster == Cluster.MainnetBeta && squadMapInfo?.isSquad ? (
                                            <MultisigBadge pubkey={account.pubkey} />
                                        ) : null}
                                        <Address pubkey={programData.authority} alignRight link />
                                    </td>
                                </tr>
                            </>
                        )}
                    </>
                )}
            </TableCardBody>
        </div>
    );
}

function MultisigBadge({ pubkey }: { pubkey: PublicKey }) {
    const programMultisigTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/program-multisig` });
    return (
        <h3 className="mb-0">
            <Link className="badge bg-success-soft rank" href={programMultisigTabPath}>
                Program Multisig
            </Link>
        </h3>
    );
}

function SecurityLabel() {
    return (
        <InfoTooltip text="Security.txt helps security researchers to contact developers if they find security bugs.">
            <Link rel="noopener noreferrer" target="_blank" href="https://github.com/neodyme-labs/solana-security-txt">
                <span className="security-txt-link-color-hack-reee">Security.txt</span>
                <ExternalLink className="align-text-top ms-2" size={13} />
            </Link>
        </InfoTooltip>
    );
}

function VerifiedLabel() {
    return (
        <InfoTooltip text="Verified builds allow users can ensure that the hash of the on-chain program matches the hash of the program of the given codebase (registry hosted by osec.io).">
            <Link
                rel="noopener noreferrer"
                target="_blank"
                href="https://github.com/Ellipsis-Labs/solana-verifiable-build"
            >
                <span className="security-txt-link-color-hack-reee">Verified Build</span>
                <ExternalLink className="align-text-top ms-2" size={13} />
            </Link>
        </InfoTooltip>
    );
}

export function UpgradeableProgramDataSection({
    account,
    programData,
}: {
    account: Account;
    programData: ProgramDataAccountInfo;
}) {
    const refresh = useFetchAccountInfo();
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Program Executable Data Account</h3>
                <button className="btn btn-white btn-sm" onClick={() => refresh(account.pubkey, 'parsed')}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Balance (ZUMA)</td>
                    <td className="text-lg-end text-uppercase">
                        <SolBalance lamports={account.lamports} />
                    </td>
                </tr>
                {account.space !== undefined && (
                    <tr>
                        <td>Data Size (Bytes)</td>
                        <td className="text-lg-end">
                            <DownloadableIcon data={programData.data[0]} filename={`${account.pubkey.toString()}.bin`}>
                                <span className="me-2">{account.space}</span>
                            </DownloadableIcon>
                        </td>
                    </tr>
                )}
                <tr>
                    <td>Upgradeable</td>
                    <td className="text-lg-end">{programData.authority !== null ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                    <td>Last Deployed Slot</td>
                    <td className="text-lg-end">
                        <Slot slot={programData.slot} link />
                    </td>
                </tr>
                {programData.authority !== null && (
                    <tr>
                        <td>Upgrade Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={programData.authority} alignRight link />
                        </td>
                    </tr>
                )}
            </TableCardBody>
        </div>
    );
}

export function UpgradeableProgramBufferSection({
    account,
    programBuffer,
}: {
    account: Account;
    programBuffer: ProgramBufferAccountInfo;
}) {
    const refresh = useFetchAccountInfo();
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Program Deploy Buffer Account</h3>
                <button className="btn btn-white btn-sm" onClick={() => refresh(account.pubkey, 'parsed')}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Balance (ZUMA)</td>
                    <td className="text-lg-end text-uppercase">
                        <SolBalance lamports={account.lamports} />
                    </td>
                </tr>
                {account.space !== undefined && (
                    <tr>
                        <td>Data Size (Bytes)</td>
                        <td className="text-lg-end">{account.space}</td>
                    </tr>
                )}
                {programBuffer.authority !== null && (
                    <tr>
                        <td>Deploy Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={programBuffer.authority} alignRight link />
                        </td>
                    </tr>
                )}
                <tr>
                    <td>Owner</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.owner} alignRight link />
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
}
