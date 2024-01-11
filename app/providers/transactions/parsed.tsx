'use client';

import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Connection, ParsedTransactionWithMeta, TransactionSignature } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import React from 'react';

export interface Details {
    transactionWithMeta?: ParsedTransactionWithMeta | null;
}

type State = Cache.State<Details>;
type Dispatch = Cache.Dispatch<Details>;

export const StateContext = React.createContext<State | undefined>(undefined);
export const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type DetailsProviderProps = { children: React.ReactNode };
export function DetailsProvider({ children }: DetailsProviderProps) {
    const { url } = useCluster();
    const [state, dispatch] = Cache.useReducer<Details>(url);

    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

async function fetchDetails(dispatch: Dispatch, signature: TransactionSignature, cluster: Cluster, url: string) {
    dispatch({
        key: signature,
        status: FetchStatus.Fetching,
        type: ActionType.Update,
        url,
    });

    let fetchStatus;
    let transactionWithMeta;
    try {
        transactionWithMeta = await new Connection(url).getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });
        fetchStatus = FetchStatus.Fetched;
    } catch (error) {
        if (cluster !== Cluster.Custom) {
            console.error(error, { url });
        }
        fetchStatus = FetchStatus.FetchFailed;
    }
    dispatch({
        data: { transactionWithMeta },
        key: signature,
        status: fetchStatus,
        type: ActionType.Update,
        url,
    });
}

export function useFetchTransactionDetails() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchTransactionDetails must be used within a TransactionsProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback(
        (signature: TransactionSignature) => {
            url && fetchDetails(dispatch, signature, cluster, url);
        },
        [dispatch, cluster, url]
    );
}

export function useTransactionDetails(signature: TransactionSignature): Cache.CacheEntry<Details> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useTransactionDetails must be used within a TransactionsProvider`);
    }

    return context.entries[signature];
}

export type TransactionDetailsCache = {
    [key: string]: Cache.CacheEntry<Details>;
};
export function useTransactionDetailsCache(): TransactionDetailsCache {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useTransactionDetailsCache must be used within a TransactionsProvider`);
    }

    return context.entries;
}
