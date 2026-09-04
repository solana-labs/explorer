import { UnknownAccountCard } from '@components/account/UnknownAccountCard';
import { Address } from '@components/common/Address';
import { DownloadableIcon } from '@components/common/Downloadable';
import { InfoTooltip } from '@components/common/InfoTooltip';
import { Slot } from '@components/common/Slot';
import { SolBalance } from '@components/common/SolBalance';
import { useRefreshAccount } from '@entities/account';
import { AccountCard } from '@features/account';
import { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { addressLabel } from '@utils/tx';
import { hashProgramBuffer } from '@utils/verified-builds';
import {
    ProgramAccountInfo,
    ProgramBufferAccountInfo,
    ProgramDataAccountInfo,
    UpgradeableLoaderAccount,
} from '@validators/accounts/upgradeable-program';
import Link from 'next/link';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { ProgramSecurityTXTBadge } from '@/app/features/security-txt/ui/SecurityTXTBadge';
import { ProgramSecurityTXTLabel } from '@/app/features/security-txt/ui/SecurityTXTLabel';
import { useSquadsMultisigLookup } from '@/app/providers/squadsMultisig';
import { KeyValue } from '@/app/shared/ui/key-value';
import { Cluster } from '@/app/utils/cluster';
import { useClusterPath } from '@/app/utils/url';

import { Copyable } from '../common/Copyable';
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
    // TODO: adopt @explorer/entity-inspector's accounts module (src/accounts: classifyAccountKindBase + kinds.ts; needs a browser-safe ./accounts subpath) instead of this inline kind dispatch
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
    const refresh = useRefreshAccount();
    const { cluster } = useCluster();
    const { data: squadMapInfo } = useSquadsMultisigLookup(programData?.authority, cluster);

    const label = addressLabel(account.pubkey.toBase58(), cluster);

    return (
        <AccountCard
            title={`${programData === undefined ? 'Closed ' : ''}Program Account`}
            account={account}
            headerOutside
            refresh={() => refresh(account.pubkey, 'parsed')}
            analyticsSection="program_section"
        >
            <KeyValue label="Address">
                <Address pubkey={account.pubkey} raw />
            </KeyValue>
            {label && <KeyValue label="Address Label">{label}</KeyValue>}
            <KeyValue label="Balance (SOL)">
                <SolBalance lamports={account.lamports} />
            </KeyValue>
            <KeyValue label="Executable">{programData !== undefined ? 'Yes' : 'No'}</KeyValue>
            <KeyValue label={`Executable Data${programData === undefined ? ' (Closed)' : ''}`}>
                <Address pubkey={programAccount.programData} link />
            </KeyValue>
            {programData !== undefined && (
                <>
                    <KeyValue label="Upgradeable">{programData.authority !== null ? 'Yes' : 'No'}</KeyValue>
                    <KeyValue label={<VerifiedLabel />}>
                        <VerifiedProgramBadge programData={programData} pubkey={account.pubkey} />
                    </KeyValue>
                    <KeyValue label={<ProgramSecurityTXTLabel />}>
                        <ProgramSecurityTXTBadge programPubkey={account.pubkey} />
                    </KeyValue>
                    <KeyValue label="Last Deployed Slot">
                        <Slot slot={programData.slot} link />
                    </KeyValue>
                    {programData.authority !== null && (
                        <KeyValue label="Upgrade Authority">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0">
                                    <Address pubkey={programData.authority} link />
                                </span>
                                {cluster == Cluster.MainnetBeta && squadMapInfo?.isSquad && (
                                    <MultisigBadge pubkey={account.pubkey} />
                                )}
                            </div>
                        </KeyValue>
                    )}
                </>
            )}
        </AccountCard>
    );
}

function MultisigBadge({ pubkey }: { pubkey: PublicKey }) {
    const programMultisigTabPath = useClusterPath({ pathname: `/address/${pubkey.toBase58()}/program-multisig` });
    return (
        <Badge ui="tw" tone="soft" variant="success" className="shrink-0" asChild>
            <Link href={programMultisigTabPath}>Program Multisig</Link>
        </Badge>
    );
}

function VerifiedLabel() {
    return (
        <InfoTooltip text="Verified builds allow users to ensure that the hash of the on-chain program matches the hash of the program of the given codebase (registry hosted by osec.io).">
            Verified Build
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
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Program Executable Data Account"
            account={account}
            headerOutside
            refresh={() => refresh(account.pubkey, 'parsed')}
            analyticsSection="program_data_section"
        >
            <KeyValue label="Address">
                <Address pubkey={account.pubkey} raw />
            </KeyValue>
            <KeyValue label="Balance (SOL)">
                <SolBalance lamports={account.lamports} />
            </KeyValue>
            {account.space !== undefined && (
                <KeyValue label="Data Size (Bytes)">
                    <DownloadableIcon data={programData.data[0]} filename={`${account.pubkey.toString()}.bin`}>
                        <span className="mr-1.5">{account.space}</span>
                    </DownloadableIcon>
                </KeyValue>
            )}
            <KeyValue label="Upgradeable">{programData.authority !== null ? 'Yes' : 'No'}</KeyValue>
            <KeyValue label="Last Deployed Slot">
                <Slot slot={programData.slot} link />
            </KeyValue>
            {programData.authority !== null && (
                <KeyValue label="Upgrade Authority">
                    <Address pubkey={programData.authority} link />
                </KeyValue>
            )}
        </AccountCard>
    );
}

export function UpgradeableProgramBufferSection({
    account,
    programBuffer,
}: {
    account: Account;
    programBuffer: ProgramBufferAccountInfo;
}) {
    const refresh = useRefreshAccount();
    const bufferHash = React.useMemo(() => hashProgramBuffer(programBuffer), [programBuffer]);
    return (
        <AccountCard
            title="Program Deploy Buffer Account"
            account={account}
            headerOutside
            refresh={() => refresh(account.pubkey, 'parsed')}
            analyticsSection="program_buffer_section"
        >
            <KeyValue label="Address">
                <Address pubkey={account.pubkey} raw />
            </KeyValue>
            <KeyValue label="Balance (SOL)">
                <SolBalance lamports={account.lamports} />
            </KeyValue>
            {account.space !== undefined && <KeyValue label="Data Size (Bytes)">{account.space}</KeyValue>}
            {bufferHash && (
                <KeyValue label={<BufferHashLabel />}>
                    <Copyable text={bufferHash}>
                        <span className="break-all font-mono">{bufferHash}</span>
                    </Copyable>
                </KeyValue>
            )}
            {programBuffer.authority !== null && (
                <KeyValue label="Deploy Authority">
                    <Address pubkey={programBuffer.authority} link />
                </KeyValue>
            )}
            <KeyValue label="Owner">
                <Address pubkey={account.owner} link />
            </KeyValue>
        </AccountCard>
    );
}

function BufferHashLabel() {
    return (
        <InfoTooltip text="sha256 of the buffer's program bytes with trailing zero padding removed — the same hash as `solana-verify get-buffer-hash`. Compare it against the build hash you expect to deploy.">
            Buffer Hash
        </InfoTooltip>
    );
}
