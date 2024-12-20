'use client';

import { type Cluster, clusters, ClusterStatus } from '@utils/cluster';
import { ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';
import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { createSolanaRpc } from 'web3js-experimental';

import { EpochSchedule } from '../utils/epoch-schedule';

type Action = State;

interface EpochInfo {
    absoluteSlot: bigint;
    blockHeight: bigint;
    epoch: bigint;
    slotIndex: bigint;
    slotsInEpoch: bigint;
}

interface ClusterInfo {
    firstAvailableBlock: bigint;
    epochSchedule: EpochSchedule;
    epochInfo: EpochInfo;
}

type Dispatch = (action: Action) => void;

type SetShowModal = React.Dispatch<React.SetStateAction<boolean>>;

interface State {
    cluster: Cluster;
    clusterInfo?: ClusterInfo;
    status: ClusterStatus;
}

function clusterReducer(state: State, action: Action): State {
    switch (action.status) {
        case ClusterStatus.Connected:
        case ClusterStatus.Failure: {
            if (state.cluster !== action.cluster) return state;
            return action;
        }
        case ClusterStatus.Connecting: {
            return action;
        }
    }
}

function parseQuery(searchParams: ReadonlyURLSearchParams | null): Cluster {
    const clusterParam = searchParams?.get('cluster');

    return clusters.get(clusterParam ?? '') || clusters.default;
}

const ModalContext = createContext<[boolean, SetShowModal] | undefined>(undefined);
const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

type ClusterProviderProps = { children: React.ReactNode };

export function ClusterProvider({ children }: ClusterProviderProps) {
    const [state, dispatch] = useReducer(clusterReducer, {
        cluster: clusters.default,
        status: ClusterStatus.Connecting,
    });
    const modalState = useState(false);
    const searchParams = useSearchParams();
    const cluster = parseQuery(searchParams);

    // Reconnect to cluster when params change
    useEffect(() => {
        updateCluster(dispatch, cluster.cluster);
    }, [cluster]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>
                <ModalContext.Provider value={modalState}>{children}</ModalContext.Provider>
            </DispatchContext.Provider>
        </StateContext.Provider>
    );
}

async function updateCluster(dispatch: Dispatch, lookup: string) {
    const cluster = clusters.get(lookup) || clusters.default;

    dispatch({
        cluster,
        status: ClusterStatus.Connecting,
    });

    try {

        const url = cluster.uri;
        new URL(url);
        const rpc = createSolanaRpc(url);

        const [firstAvailableBlock, epochSchedule, epochInfo] = await Promise.all([
            rpc.getFirstAvailableBlock().send(),
            rpc.getEpochSchedule().send(),
            rpc.getEpochInfo().send(),
        ]);

        dispatch({
            cluster,
            clusterInfo: {
                epochInfo,
                // These are incorrectly typed as unknown
                // See https://github.com/solana-labs/solana-web3.js/issues/1389
                epochSchedule: epochSchedule as EpochSchedule,
                firstAvailableBlock: firstAvailableBlock as bigint,
            },
            status: ClusterStatus.Connected,
        });
    } catch (error) {
        console.error(error);

        dispatch({
            cluster: clusters.default,
            status: ClusterStatus.Failure,
        });
    }
}

export function useCluster() {
    const context = useContext(StateContext);
    if (!context) {
        throw new Error(`useCluster must be used within a ClusterProvider`);
    }
    return {
        ...context,
        name: context.cluster.name,
        url: context.cluster.uri,
    };
}

export function useClusterModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error(`useClusterModal must be used within a ClusterProvider`);
    }
    return context;
}
