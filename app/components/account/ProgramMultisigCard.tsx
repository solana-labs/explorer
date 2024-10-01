import { PublicKey } from '@solana/web3.js';
import { Suspense } from 'react';

import { UpgradeableLoaderAccountData } from '@/app/providers/accounts';
import { useAnchorProgram } from '@/app/providers/anchor';
import { useCluster } from '@/app/providers/cluster';
import {
    SQUADS_V3_ADDRESS,
    SQUADS_V4_ADDRESS,
    useSquadsMultisig,
    useSquadsMultisigLookup,
} from '@/app/providers/squadsMultisig';

import { Address } from '../common/Address';
import { LoadingCard } from '../common/LoadingCard';
import { TableCardBody } from '../common/TableCardBody';

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
    const anchorProgram = useAnchorProgram(squadMapInfo?.version === 'v3' ? SQUADS_V3_ADDRESS : SQUADS_V4_ADDRESS, url);
    const { data: squadInfo } = useSquadsMultisig(
        anchorProgram.program,
        squadMapInfo?.multisig,
        cluster,
        squadMapInfo?.version
    );

    let members: PublicKey[];
    if (squadInfo !== undefined && squadInfo?.version === 'v4') {
        members = squadInfo.multisig.members.map(obj => obj.key) ?? [];
    } else {
        members = squadInfo?.multisig.keys ?? [];
    }

    return (
        <div className="card security-txt">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">
                    Upgrade Authority Multisig Information
                </h3>
            </div>
            <TableCardBody>
                <tr>
                    <td>Multisig Program</td>
                    <td className="text-lg-end">{squadMapInfo?.version === 'v4' ? 'Squads V4' : 'Squads V3'}</td>
                </tr>
                <tr>
                    <td>Multisig Program Id</td>
                    <td className="text-lg-end">
                        <Address
                            pubkey={
                                new PublicKey(squadMapInfo?.version === 'v4' ? SQUADS_V4_ADDRESS : SQUADS_V3_ADDRESS)
                            }
                            alignRight
                            link
                        />
                    </td>
                </tr>
                <tr>
                    <td>Multisig Account</td>
                    <td className="text-lg-end">
                        {squadMapInfo?.isSquad ? (
                            <Address pubkey={new PublicKey(squadMapInfo.multisig)} alignRight link />
                        ) : null}
                    </td>
                </tr>
                <tr>
                    <td>Multisig Approval Threshold</td>
                    <td className="text-lg-end">
                        {squadInfo?.multisig.threshold}
                        {' of '}
                        {squadInfo?.version === 'v4'
                            ? squadInfo?.multisig.members.length
                            : squadInfo?.multisig.keys.length}
                    </td>
                </tr>
                {members.map((member, idx) => (
                    <tr key={idx}>
                        <td>Multisig Member {idx + 1}</td>
                        <td className="text-lg-end">
                            <Address pubkey={member} alignRight link />
                        </td>
                    </tr>
                ))}
            </TableCardBody>
        </div>
    );
}
