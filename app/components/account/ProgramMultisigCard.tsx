import { useAnchorProgram } from '@entities/idl';
import { PublicKey } from '@solana/web3.js';
import { Suspense } from 'react';

import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { UpgradeableLoaderAccountData } from '@/app/providers/accounts';
import { useCluster } from '@/app/providers/cluster';
import {
    SQUADS_V3_ADDRESS,
    SQUADS_V4_ADDRESS,
    useSquadsMultisig,
    useSquadsMultisigLookup,
} from '@/app/providers/squadsMultisig';
import { SectionCard } from '@/app/shared/ui/Card/SectionCard';
import { KeyValue } from '@/app/shared/ui/key-value';

import { Address } from '../common/Address';
import { LoadingCard } from '../common/LoadingCard';

// The Squads program ids are static constants — decode them once at module load instead of building a
// fresh PublicKey (base58 decode + validation) on every render.
const SQUADS_V3_PUBKEY = new PublicKey(SQUADS_V3_ADDRESS);
const SQUADS_V4_PUBKEY = new PublicKey(SQUADS_V4_ADDRESS);

export function ProgramMultisigCard({ data }: { data: UpgradeableLoaderAccountData }) {
    return (
        <Suspense fallback={<LoadingCard message="Loading multisig information" />}>
            <ProgramMultisigCardInner programAuthority={data.programData?.authority} />
        </Suspense>
    );
}

function ProgramMultisigCardInner({ programAuthority }: { programAuthority: PublicKey | null | undefined }) {
    const { cluster, url } = useCluster();
    const { data: squadMapInfo } = useSquadsMultisigLookup(programAuthority, cluster);
    const anchorProgram = useAnchorProgram(
        squadMapInfo?.version === 'v3' ? SQUADS_V3_ADDRESS : SQUADS_V4_ADDRESS,
        url,
        cluster,
    );
    const { data: squadInfo } = useSquadsMultisig(
        anchorProgram.program,
        squadMapInfo?.multisig,
        cluster,
        squadMapInfo?.version,
    );

    let members: PublicKey[];
    if (squadInfo !== undefined && squadInfo?.version === 'v4') {
        members = squadInfo.multisig.members.map(obj => obj.key) ?? [];
    } else {
        members = squadInfo?.multisig.keys ?? [];
    }

    const memberCount =
        squadInfo?.version === 'v4' ? squadInfo?.multisig.members.length : squadInfo?.multisig.keys.length;

    return (
        <SectionCard title="Upgrade Authority Multisig Information">
            <KeyValue label="Multisig Program">{squadMapInfo?.version === 'v4' ? 'Squads V4' : 'Squads V3'}</KeyValue>
            <KeyValue label="Multisig Program Id">
                <Address pubkey={squadMapInfo?.version === 'v4' ? SQUADS_V4_PUBKEY : SQUADS_V3_PUBKEY} link />
            </KeyValue>
            <KeyValue label="Multisig Account">
                {squadMapInfo?.isSquad && <Address pubkey={new PublicKey(squadMapInfo.multisig)} link />}
            </KeyValue>
            <KeyValue label="Multisig Approval Threshold">
                {/* `useSquadsMultisig` resolves after the Suspense-covered lookup, so guard the quorum
                    text with a skeleton — otherwise the row flashes a bare "of" until it loads. */}
                {squadInfo ? `${squadInfo.multisig.threshold} of ${memberCount}` : <Skeleton className="h-4 w-16" />}
            </KeyValue>
            {members.map((member, idx) => (
                <KeyValue key={idx} label={`Multisig Member ${idx + 1}`}>
                    <Address pubkey={member} link />
                </KeyValue>
            ))}
        </SectionCard>
    );
}
