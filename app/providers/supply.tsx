'use client';

import { useCluster } from '@providers/cluster';
import { Cluster, ClusterStatus } from '@utils/cluster';
import React from 'react';
import { createDefaultRpcTransport, createSolanaRpc } from 'web3js-experimental';

export enum Status {
    Idle,
    Disconnected,
    Connecting,
}

type Lamports = bigint;

type Supply = Readonly<{
    circulating: Lamports;
    nonCirculating: Lamports;
    total: Lamports;
}>;

type State = Supply | Status | string;

type Dispatch = React.Dispatch<React.SetStateAction<State>>;
const StateContext = React.createContext<State | undefined>(undefined);
const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type Props = { children: React.ReactNode };
export function SupplyProvider({ children }: Props) {
    const [state, setState] = React.useState<State>(Status.Idle);
    const { status: clusterStatus, cluster, url } = useCluster();

    React.useEffect(() => {
        if (state !== Status.Idle) {
            if (clusterStatus === ClusterStatus.Connecting) setState(Status.Disconnected);
            if (clusterStatus === ClusterStatus.Connected) fetch(setState, cluster, url);
        }
    }, [clusterStatus, cluster, url]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={setState}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

async function fetch(dispatch: Dispatch, cluster: Cluster, url: string) {
    dispatch(Status.Connecting);

    try {
        const transport = createDefaultRpcTransport({ url });
        const rpc = createSolanaRpc({ transport });

        const supplyResponse = await rpc
            .getSupply({ commitment: 'finalized', excludeNonCirculatingAccountsList: true })
            .send();
        const supply: Supply = {
            circulating: supplyResponse.value.circulating,
            nonCirculating: supplyResponse.value.nonCirculating,
            total: supplyResponse.value.total,
        };

        // Update state if still connecting
        dispatch(state => {
            if (state !== Status.Connecting) return state;
            return supply;
        });
    } catch (err) {
        if (cluster !== Cluster.Custom) {
            console.error(err, { url });
        }
        dispatch('Failed to fetch supply');
    }
}

export function useSupply() {
    const state = React.useContext(StateContext);
    if (state === undefined) {
        throw new Error(`useSupply must be used within a SupplyProvider`);
    }
    return state;
}

export function useFetchSupply() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchSupply must be used within a SupplyProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback(() => {
        fetch(dispatch, cluster, url);
    }, [dispatch, cluster, url]);
}
