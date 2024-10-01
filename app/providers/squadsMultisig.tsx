import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import useSWRImmutable from 'swr/immutable';

export const SQUADS_V3_ADDRESS = 'SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu';
export const SQUADS_V4_ADDRESS = 'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf';

export type SquadsMultisigVersion = 'v3' | 'v4';
export type SquadsMultisigMapInfo = {
    isSquad: boolean;
    version: SquadsMultisigVersion;
    multisig: string;
};
export type MinimalMultisigInfo =
    | { version: 'v4'; multisig: { threshold: number; members: Array<{ key: PublicKey }> } }
    | { version: 'v3'; multisig: { threshold: number; keys: Array<PublicKey> } };

const SQUADS_MAP_URL = 'https://4fnetmviidiqkjzenwxe66vgoa0soerr.lambda-url.us-east-1.on.aws/isSquadV2';

// Squads Multisig reverse map info is only available on mainnet
export function useSquadsMultisigLookup(programAuthority: PublicKey | null | undefined, cluster: Cluster) {
    return useSWRImmutable<SquadsMultisigMapInfo | null>(
        ['squadsReverseMap', programAuthority?.toString(), cluster],
        async ([_prefix, programIdString, cluster]: [string, string | undefined, Cluster]) => {
            if (cluster !== Cluster.MainnetBeta || !programIdString) {
                return null;
            }
            const response = await fetch(`${SQUADS_MAP_URL}/${programIdString}`);
            const data = await response.json();
            return 'error' in data ? null : (data as SquadsMultisigMapInfo);
        },
        { suspense: true }
    );
}

export function useSquadsMultisig(
    anchorProgram: Program | null | undefined,
    multisig: string | undefined,
    cluster: Cluster,
    version: SquadsMultisigVersion | undefined
) {
    return useSWRImmutable<MinimalMultisigInfo | null>(
        ['squadsMultisig', multisig, cluster],
        async ([_prefix, multisig, cluster]: [string, string | undefined, Cluster]) => {
            if (cluster !== Cluster.MainnetBeta || !multisig || !version) {
                return null;
            }
            if (version === 'v4') {
                const multisigInfo = await (anchorProgram?.account as unknown as any).multisig.fetch(
                    multisig,
                    'confirmed'
                );
                return {
                    multisig: multisigInfo,
                    version,
                };
            } else if (version === 'v3') {
                const multisigInfo = await (anchorProgram?.account as unknown as any).ms.fetch(multisig, 'confirmed');
                return {
                    multisig: multisigInfo,
                    version,
                };
            } else {
                return null;
            }
        }
    );
}
