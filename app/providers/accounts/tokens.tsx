'use client';

import { getRpc } from '@entities/cluster';
import { useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { TokenAccountInfo } from '@validators/accounts/token';
import React from 'react';
import { create } from 'superstruct';

import { withNumbersInsteadOfBigInts } from '@/app/shared/lib/bigint-to-number';
import { Logger } from '@/app/shared/lib/logger';
import { toKitAddress, toLegacyPublicKey } from '@/app/shared/lib/web3js-compat';
import { getCurrentTokenScaledUiAmountMultiplier } from '@/app/utils/token-info';
import { MintAccountInfo } from '@/app/validators/accounts/token';

export type TokenInfoWithPubkey = {
    info: TokenAccountInfo;
    pubkey: PublicKey;
};

interface AccountTokens {
    tokens?: TokenInfoWithPubkey[];
}

export type State = Cache.State<AccountTokens>;
export type Dispatch = Cache.Dispatch<AccountTokens>;

export const StateContext = React.createContext<State | undefined>(undefined);
export const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type ProviderProps = { children: React.ReactNode };
export function TokensProvider({ children }: ProviderProps) {
    const { url } = useCluster();
    const [state, dispatch] = Cache.useReducer<AccountTokens>(url);

    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export function isTokenProgramId(programId: PublicKey) {
    return programId.equals(TOKEN_PROGRAM_ID) || programId.equals(TOKEN_2022_PROGRAM_ID);
}

async function fetchAccountTokens(dispatch: Dispatch, pubkey: PublicKey, cluster: Cluster, url: string) {
    const key = pubkey.toBase58();
    dispatch({
        key,
        status: FetchStatus.Fetching,
        type: ActionType.Update,
        url,
    });

    let status;
    let data;
    try {
        const rpc = getRpc(url);
        const owner = toKitAddress(pubkey);
        const fetchByProgram = (programId: PublicKey) =>
            rpc
                .getTokenAccountsByOwner(
                    owner,
                    { programId: toKitAddress(programId) },
                    { commitment: 'processed', encoding: 'jsonParsed' },
                )
                .send();

        const [{ value: tokenAccounts }, { value: token2022Accounts }] = await Promise.all([
            fetchByProgram(TOKEN_PROGRAM_ID),
            fetchByProgram(TOKEN_2022_PROGRAM_ID),
        ]);

        // Raw holdings only, uncapped. Consumers resolve symbol/logo/name themselves.
        const tokens: TokenInfoWithPubkey[] = [...tokenAccounts, ...token2022Accounts].map(accountInfo => {
            const info = create(withNumbersInsteadOfBigInts(accountInfo.account.data.parsed.info), TokenAccountInfo);
            return { info, pubkey: toLegacyPublicKey(accountInfo.pubkey) };
        });

        data = {
            tokens,
        };
        status = FetchStatus.Fetched;
    } catch (error) {
        if (cluster !== Cluster.Custom) {
            Logger.error(new Error('Failed to fetch token accounts', { cause: error }), { url });
        }
        status = FetchStatus.FetchFailed;
    }
    dispatch({ data, key, status, type: ActionType.Update, url });
}

export function useAccountOwnedTokens(address: string): Cache.CacheEntry<AccountTokens> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useAccountOwnedTokens must be used within a AccountsProvider`);
    }

    return context.entries[address];
}

export function useFetchAccountOwnedTokens() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchAccountOwnedTokens must be used within a AccountsProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback(
        (pubkey: PublicKey) => {
            fetchAccountTokens(dispatch, pubkey, cluster, url);
        },
        [dispatch, cluster, url],
    );
}

export function useScaledUiAmountForMint(address: string | undefined, rawAmount: string): [string, string] {
    const mint = useAccountInfo(address);
    const refresh = useFetchAccountInfo();

    React.useEffect(() => {
        if (address && !mint) {
            refresh(new PublicKey(address), 'parsed');
        }
    }, [address, refresh, mint]);

    if (!mint) {
        return [rawAmount, '1'];
    }

    const infoParsed = mint?.data?.data.parsed;
    const mintInfo = infoParsed && create(infoParsed?.parsed.info, MintAccountInfo);
    const scaledUiAmountMultiplier = getCurrentTokenScaledUiAmountMultiplier(mintInfo?.extensions);

    if (scaledUiAmountMultiplier === '1') {
        return [rawAmount, '1'];
    }

    return [(Number(rawAmount) * Number(scaledUiAmountMultiplier)).toString(), scaledUiAmountMultiplier];
}
