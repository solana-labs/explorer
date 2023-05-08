'use client';

import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Connection, ParsedAccountData, PublicKey, TokenAccountBalancePair } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { reportError } from '@utils/sentry';
import { TokenAccount, TokenAccountInfo } from '@validators/accounts/token';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';

type LargestAccounts = {
    largest: TokenAccountBalancePairWithOwner[];
};

type State = Cache.State<LargestAccounts>;
type Dispatch = Cache.Dispatch<LargestAccounts>;

const StateContext = React.createContext<State | undefined>(undefined);
const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type ProviderProps = { children: React.ReactNode };
export function LargestAccountsProvider({ children }: ProviderProps) {
    const { url } = useCluster();
    const [state, dispatch] = Cache.useReducer<LargestAccounts>(url);

    // Clear cache whenever cluster is changed
    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

type OptionalOwner = {
    owner?: PublicKey;
};

export type TokenAccountBalancePairWithOwner = TokenAccountBalancePair & OptionalOwner;

async function fetchLargestAccounts(dispatch: Dispatch, pubkey: PublicKey, cluster: Cluster, url: string) {
    dispatch({
        key: pubkey.toBase58(),
        status: Cache.FetchStatus.Fetching,
        type: ActionType.Update,
        url,
    });

    let data;
    let fetchStatus;
    try {
        data = {
            largest: (await new Connection(url, 'confirmed').getTokenLargestAccounts(pubkey)).value,
        };

        data.largest = await Promise.all(
            data.largest.map(async (account): Promise<TokenAccountBalancePairWithOwner> => {
                try {
                    const accountInfo = (await new Connection(url, 'confirmed').getParsedAccountInfo(account.address))
                        .value;
                    if (accountInfo && 'parsed' in accountInfo.data) {
                        const info = createParsedAccountInfo(accountInfo.data);
                        return {
                            ...account,
                            owner: info.owner,
                        };
                    }
                } catch (error) {
                    if (cluster !== Cluster.Custom) {
                        reportError(error, { url });
                    }
                }
                return account;
            })
        );

        fetchStatus = FetchStatus.Fetched;
    } catch (error) {
        if (cluster !== Cluster.Custom) {
            reportError(error, { url });
        }
        fetchStatus = FetchStatus.FetchFailed;
    }
    dispatch({
        data,
        key: pubkey.toBase58(),
        status: fetchStatus,
        type: ActionType.Update,
        url,
    });
}

export function useFetchTokenLargestAccounts() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchTokenLargestAccounts must be used within a MintsProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback(
        (pubkey: PublicKey) => {
            fetchLargestAccounts(dispatch, pubkey, cluster, url);
        },
        [dispatch, cluster, url]
    );
}

export function useTokenLargestTokens(address: string): Cache.CacheEntry<LargestAccounts> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useTokenLargestTokens must be used within a MintsProvider`);
    }

    return context.entries[address];
}

function createParsedAccountInfo(parsedData: ParsedAccountData): TokenAccountInfo {
    const data = create(parsedData.parsed, ParsedInfo);
    const parsed = create(data, TokenAccount);
    return create(parsed.info, TokenAccountInfo);
}
