import { useCluster } from '@providers/cluster';
import { Cluster } from '@utils/cluster';
import React from 'react';
import { createDefaultRpcTransport, createSolanaRpc } from 'web3js-experimental';

type VoteAccountInfo = Readonly<{
    activatedStake: bigint,
}>;

type VoteAccounts = Readonly<{
    current: VoteAccountInfo[],
    delinquent: VoteAccountInfo[],
}>;

async function fetchVoteAccounts(
    cluster: Cluster,
    url: string,
    setVoteAccounts: React.Dispatch<React.SetStateAction<VoteAccounts | undefined>>
) {
    try {
        const transport = createDefaultRpcTransport({ url });
        const rpc = createSolanaRpc({ transport });

        const voteAccountsResponse = await rpc.getVoteAccounts({ commitment: 'confirmed' }).send();
        const voteAccounts: VoteAccounts = {
            current: voteAccountsResponse.current.map(c => ({ activatedStake: c.activatedStake })),
            delinquent: voteAccountsResponse.delinquent.map(d => ({ activatedStake: d.activatedStake })),
        }

        setVoteAccounts(voteAccounts);
    } catch (error) {
        if (cluster !== Cluster.Custom) {
            console.error(error, { url });
        }
    }
}

export function useVoteAccounts() {
    const [voteAccounts, setVoteAccounts] = React.useState<VoteAccounts>();
    const { cluster, url } = useCluster();

    return {
        fetchVoteAccounts: () => fetchVoteAccounts(cluster, url, setVoteAccounts),
        voteAccounts,
    };
}
