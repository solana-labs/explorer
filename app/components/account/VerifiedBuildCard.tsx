import { ErrorCard } from '@components/common/ErrorCard';
import { UpgradeableLoaderAccountData } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { ExternalLink, Info } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { getSafeExternalHref } from '@/app/shared/lib/url';
import { Alert } from '@/app/shared/ui/Alert/Alert';
import { CardBody } from '@/app/shared/ui/Card';
import { SectionCard } from '@/app/shared/ui/Card/SectionCard';
import { CopyableCode } from '@/app/shared/ui/CopyableCode';
import { ExternalLinkValue, KeyValue, TextValue } from '@/app/shared/ui/key-value';
import { OSEC_URL, OsecRegistryInfo, useVerifiedProgram, VerificationStatus } from '@/app/utils/verified-builds';
import { VERIFIED_BUILDS_GUIDE_URL } from '@/app/utils/verified-builds-url';

import { Address } from '../common/Address';
import { LoadingCard } from '../common/LoadingCard';
import { BufferBuildCard } from './BufferBuildCard';

export function VerifiedBuildCard({ data, pubkey }: { data: UpgradeableLoaderAccountData; pubkey: PublicKey }) {
    // A program buffer stages a binary that is not yet deployed, so it has no program id to look up
    // in the OSEC registry. Resolve its buffer hash to the source build(s) that produced it instead.
    // Each branch renders a distinct component, so neither calls a hook conditionally.
    if (data.parsed.type === 'buffer') {
        return <BufferBuildCard buffer={data.parsed.info} pubkey={pubkey} />;
    }

    return <DeployedProgramVerifiedBuildCard data={data} pubkey={pubkey} />;
}

function DeployedProgramVerifiedBuildCard({ data, pubkey }: { data: UpgradeableLoaderAccountData; pubkey: PublicKey }) {
    // suspense:false -- the chain mixes with a non-suspense SWR (useProgramIdls via useAnchorProgram); the mixed path triggers hook-order warnings under HMR.
    const { data: registryInfo, isLoading } = useVerifiedProgram({
        options: { suspense: false },
        programAuthority: data.programData?.authority ? new PublicKey(data.programData.authority) : null,
        programData: data.programData,
        programId: pubkey,
    });

    return <BaseVerifiedBuildCard data={data} registryInfo={registryInfo ?? null} isLoading={isLoading} />;
}

export function BaseVerifiedBuildCard({
    data,
    registryInfo,
    isLoading,
}: {
    data: UpgradeableLoaderAccountData;
    registryInfo: OsecRegistryInfo | null;
    isLoading: boolean;
}) {
    if (!data.programData) {
        return <ErrorCard text="Account has no data" />;
    }

    if (isLoading) {
        return <LoadingCard message="Fetching last verified build hash" />;
    }

    if (!registryInfo) {
        return (
            <SectionCard title="Verified Build">
                <CardBody ui="dashkit" className="text-center">
                    Verified build information not yet uploaded by the program authority. For more information, see the{' '}
                    <Link href={VERIFIED_BUILDS_GUIDE_URL} target="_blank">
                        Verified Build Guide
                    </Link>
                    .<br />
                    <br />
                    Note: Some programs were verified using older, deprecated versions of the API and may not include
                    on-chain verification details.
                </CardBody>
            </SectionCard>
        );
    }

    // Define the message based on the verification status
    let verificationMessage: ReactNode;
    if (
        registryInfo.verification_status === VerificationStatus.Verified ||
        registryInfo.verification_status === VerificationStatus.PdaUploaded
    ) {
        verificationMessage = (
            <>
                Information provided by{' '}
                <a href={OSEC_URL} target="_blank" rel="noopener noreferrer">
                    osec.io
                </a>
            </>
        );
    } else if (registryInfo.verification_status === VerificationStatus.NotVerified) {
        verificationMessage = 'No verified build found';
    }

    return (
        <>
            <SectionCard
                title="Verified Build"
                noCardMargin
                note={
                    <Alert variant="info" appearance="outlined" icon={<Info size={16} />} className="!mb-0">
                        A verified build badge indicates that this program was built from source code that is publicly
                        available, but does not imply that this program has been audited. For more details, refer to the{' '}
                        <a href={VERIFIED_BUILDS_GUIDE_URL} target="_blank" rel="noopener noreferrer">
                            Verified Builds Guide
                            <ExternalLink className="relative -top-0.5 ml-1.5" size={13} />
                        </a>
                        .
                    </Alert>
                }
            >
                {ROWS.filter(x => x.key in registryInfo).map(x => (
                    <KeyValue key={x.key} label={x.display}>
                        <RenderEntry value={registryInfo[x.key]} type={x.type} mono={x.mono ?? true} />
                    </KeyValue>
                ))}
            </SectionCard>
            {verificationMessage && (
                <div className="mb-10 mt-3 px-1 text-sm text-outer-space-300">{verificationMessage}</div>
            )}
        </>
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
    /** Render the value in the normal body font instead of monospace. */
    mono?: boolean;
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
        mono: false,
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
        mono: false,
        type: DisplayType.Date,
    },
    {
        display: 'Verify Command',
        key: 'verify_command',
        type: DisplayType.LongString,
    },
    {
        display: 'Repository URL',
        key: 'onchain_repo_url',
        mono: false,
        type: DisplayType.URL,
    },
];

function RenderEntry({
    value,
    type,
    mono,
}: {
    value: OsecRegistryInfo[keyof OsecRegistryInfo];
    type: DisplayType;
    mono: boolean;
}) {
    switch (type) {
        case DisplayType.Boolean:
            return (
                <Badge ui="dashkit" variant={value ? 'success' : 'warning'}>
                    {String(value)}
                </Badge>
            );
        case DisplayType.String:
            if (Object.values(VerificationStatus).includes(value as VerificationStatus)) {
                const isVerified = value === VerificationStatus.Verified;
                return (
                    <Badge ui="dashkit" variant={isVerified ? 'success' : 'warning'}>
                        {isVerified ? 'true' : 'false'}
                    </Badge>
                );
            }
            return (
                <TextValue mono={mono} preserveWhitespace>
                    {value && (value as string).length > 1 ? value : '-'}
                </TextValue>
            );
        case DisplayType.LongString:
            return value && (value as string).length > 1 ? (
                <CopyableCode value={value as string} />
            ) : (
                <TextValue mono={mono}>-</TextValue>
            );
        case DisplayType.URL:
            return getSafeExternalHref(value as string) ? (
                <ExternalLinkValue url={value as string} mono={mono} />
            ) : (
                <TextValue mono={mono}>
                    {value && (value as string).length > 1 ? (value as string).trim() : '-'}
                </TextValue>
            );
        case DisplayType.Date:
            return (
                <TextValue mono={mono}>
                    {value && (value as string).length > 1 ? new Date(value as string).toUTCString() : '-'}
                </TextValue>
            );
        case DisplayType.PublicKey:
            return <Address pubkey={new PublicKey(value as string)} link />;
        default:
            return null;
    }
}
