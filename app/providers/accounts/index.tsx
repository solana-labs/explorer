'use client';

import { getRpc, type SolanaRpc } from '@entities/cluster';
import { fetchNftData } from '@entities/nft';
import {
    ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL,
    BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL,
    CONFIG_PROGRAM_LABEL,
    isParsedAccountProgram,
    isTokenProgram,
    NONCE_PROGRAM_LABEL,
    SPL_TOKEN_2022_PROGRAM_LABEL,
    SPL_TOKEN_PROGRAM_LABEL,
    STAKE_PROGRAM_LABEL,
    SYSVAR_PROGRAM_LABEL,
    type TokenProgram,
    VOTE_PROGRAM_LABEL,
} from '@explorer/parsers';
// deep imports on purpose: the barrel also re-exports the stake instruction cards, which import the
// instruction-card entity — and that reaches back here, closing an import cycle
import { getStakeActivation } from '@features/stake/api/stake-activation';
import { StakeAccount } from '@features/stake/lib/validators';
// deep imports on purpose: this provider only needs the history provider and read hook,
// not the transaction-history UI that the feature barrel re-exports
import { HistoryProvider } from '@features/transaction-history/model/history-provider';
import { VoteAccount } from '@features/vote/lib/validators'; // deep import on purpose: this provider only needs the account schema, not the vote UI the barrel re-exports
import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCacheEntries, useCacheEntry } from '@providers/cache-entry';
import { useCluster } from '@providers/cluster';
import type { AccountInfoWithJsonData } from '@solana/kit';
import {
    AddressLookupTableAccount,
    AddressLookupTableProgram,
    PublicKey,
    StakeActivationData,
    SystemProgram,
} from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { ParsedAddressLookupTableAccount } from '@validators/accounts/address-lookup-table';
import { ConfigAccount } from '@validators/accounts/config';
import { NonceAccount } from '@validators/accounts/nonce';
import { SysvarAccount } from '@validators/accounts/sysvar';
import { MintAccountInfo, TokenAccount, TokenAccountInfo } from '@validators/accounts/token';
import {
    ProgramDataAccount,
    ProgramDataAccountInfo,
    UpgradeableLoaderAccount,
} from '@validators/accounts/upgradeable-program';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';

import { withNumbersInsteadOfBigInts } from '@/app/shared/lib/bigint-to-number';
import { alloc, fromBase64 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { toKitAddress, toLegacyPublicKey } from '@/app/shared/lib/web3js-compat';

import { RewardsProvider } from './rewards';
import { TokensProvider } from './tokens';
export { useAccountHistory } from '@features/transaction-history/model/use-account-history';

export type StakeProgramData = {
    program: typeof STAKE_PROGRAM_LABEL; // 'stake'
    parsed: StakeAccount;
    activation?: StakeActivationData;
};

export type UpgradeableLoaderAccountData = {
    program: typeof BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL; // 'bpf-upgradeable-loader'
    parsed: UpgradeableLoaderAccount;
    programData?: ProgramDataAccountInfo;
};

export function isUpgradeableLoaderAccountData(data: { program: string }): data is UpgradeableLoaderAccountData {
    return isParsedAccountProgram(data, BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL);
}

import type { NFTData } from '@entities/nft';
export type { EditionInfo, NFTData } from '@entities/nft';

export function isTokenProgramData(data: { program: string }): data is TokenProgramData {
    return isTokenProgram(data.program);
}
export type TokenProgramData = {
    program: TokenProgram;
    parsed: TokenAccount;
    nftData?: NFTData;
};

export type VoteProgramData = {
    program: typeof VOTE_PROGRAM_LABEL; // 'vote'
    parsed: VoteAccount;
};

export type NonceProgramData = {
    program: typeof NONCE_PROGRAM_LABEL; // 'nonce'
    parsed: NonceAccount;
};

export type SysvarProgramData = {
    program: typeof SYSVAR_PROGRAM_LABEL; // 'sysvar'
    parsed: SysvarAccount;
};

export type ConfigProgramData = {
    program: typeof CONFIG_PROGRAM_LABEL; // 'config'
    parsed: ConfigAccount;
};

export type AddressLookupTableProgramData = {
    program: typeof ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL; // 'address-lookup-table'
    parsed: ParsedAddressLookupTableAccount;
};

export type ParsedData =
    | UpgradeableLoaderAccountData
    | StakeProgramData
    | TokenProgramData
    | VoteProgramData
    | NonceProgramData
    | SysvarProgramData
    | ConfigProgramData
    | AddressLookupTableProgramData;

export interface AccountData {
    parsed?: ParsedData;
    raw?: Uint8Array;
}

export interface Account {
    pubkey: PublicKey;
    lamports: number;
    executable: boolean;
    owner: PublicKey;
    space?: number;
    data: AccountData;
}

/**
 * Contexts and State exported for mocking purposes only (e.g., Storybook stories).
 * Do not use these directly in application code - use the provided hooks instead.
 * @see .storybook/__mocks__/MockAccountsProvider.tsx
 */
export type State = Cache.State<Account>;
export type Dispatch = Cache.Dispatch<Account>;
type Fetchers = { [mode in FetchAccountDataMode]: MultipleAccountFetcher };

export const FetchersContext = React.createContext<Fetchers | undefined>(undefined);
export const StateContext = React.createContext<State | undefined>(undefined);
export const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type BatchOptions = {
    dispatch: Dispatch;
    url: string;
    dataMode: FetchAccountDataMode;
    fetchNftMetadata: boolean;
    onError: (error: unknown) => void;
};

class MultipleAccountFetcher {
    pubkeys: Set<string> = new Set();
    fetchTimeout?: NodeJS.Timeout;

    constructor(private options: BatchOptions) {}
    fetch = (pubkey: PublicKey) => {
        this.pubkeys.add(pubkey.toBase58());
        if (this.fetchTimeout === undefined) {
            this.fetchTimeout = setTimeout(() => {
                this.fetchTimeout = undefined;
                const pubkeys = Array.from(this.pubkeys).map(p => new PublicKey(p));
                this.pubkeys.clear();

                fetchMultipleAccounts({ ...this.options, pubkeys });
            }, 100);
        }
    };
    cancel = () => {
        clearTimeout(this.fetchTimeout);
        this.fetchTimeout = undefined;
    };
}

export type FetchAccountDataMode = 'parsed' | 'raw' | 'skip';

type AccountsProviderProps = {
    children: React.ReactNode;
    /**
     * Enrich parsed mints with Metaplex metadata. Off by default: it costs two serial RPC round trips
     * per mint plus an off-chain JSON read, and only the address page renders the result.
     *
     * Safe as a per-provider switch only because each mount owns its own cache — a page that opts out
     * can never hand a stripped entry to a page that needs the metadata. Hoisting this provider to a
     * shared layout would break that.
     */
    fetchNftMetadata?: boolean;
};
export function AccountsProvider({ children, fetchNftMetadata = false }: AccountsProviderProps) {
    const { cluster, url } = useCluster();
    const [state, dispatch] = Cache.useReducer<Account>(url);

    // A saved custom endpoint can resolve to the same url as a preset cluster, so `cluster` must not take part
    // in the fetcher identity below: rebuilding the fetchers cancels batches already in flight, and switching
    // between two selections that share one endpoint changes nothing a batch depends on. The cluster only
    // decides whether a failure is ours to report, so the reporter reads the current one through a ref.
    const clusterRef = React.useRef(cluster);
    clusterRef.current = cluster;

    const reportFetchError = React.useCallback(
        (error: unknown) => {
            // A custom endpoint fails for reasons we do not control, so its failures are not ours to report.
            if (clusterRef.current !== Cluster.Custom) {
                Logger.error(error, { url });
            }
        },
        [url],
    );

    const fetchers = React.useMemo<Fetchers>(() => {
        const shared = { dispatch, fetchNftMetadata, onError: reportFetchError, url };
        return {
            parsed: new MultipleAccountFetcher({ ...shared, dataMode: 'parsed' }),
            raw: new MultipleAccountFetcher({ ...shared, dataMode: 'raw' }),
            skip: new MultipleAccountFetcher({ ...shared, dataMode: 'skip' }),
        };
    }, [dispatch, url, fetchNftMetadata, reportFetchError]);

    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    // Cancel pending timers on deps-change and unmount so a debounced batch can't fire into a stale tree.
    React.useEffect(() => {
        return () => {
            fetchers.parsed.cancel();
            fetchers.raw.cancel();
            fetchers.skip.cancel();
        };
    }, [fetchers]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>
                <FetchersContext.Provider value={fetchers}>
                    <TokensProvider>
                        <HistoryProvider>
                            <RewardsProvider>{children}</RewardsProvider>
                        </HistoryProvider>
                    </TokensProvider>
                </FetchersContext.Provider>
            </DispatchContext.Provider>
        </StateContext.Provider>
    );
}

async function fetchMultipleAccounts({
    dispatch,
    pubkeys,
    dataMode,
    fetchNftMetadata,
    onError,
    url,
}: BatchOptions & { pubkeys: PublicKey[] }) {
    for (const pubkey of pubkeys) {
        dispatch({
            key: pubkey.toBase58(),
            status: Cache.FetchStatus.Fetching,
            type: ActionType.Update,
            url,
        });
    }

    const BATCH_SIZE = 100;
    const rpc = getRpc(url);
    const pendingMetadata: Promise<void>[] = [];

    let nextBatchStart = 0;
    while (nextBatchStart < pubkeys.length) {
        const batch = pubkeys.slice(nextBatchStart, nextBatchStart + BATCH_SIZE);
        nextBatchStart += BATCH_SIZE;

        try {
            const addresses = batch.map(toKitAddress);
            const { value: results } =
                dataMode === 'parsed'
                    ? await rpc
                          .getMultipleAccounts(addresses, { commitment: 'confirmed', encoding: 'jsonParsed' })
                          .send()
                    : await rpc
                          .getMultipleAccounts(addresses, {
                              commitment: 'confirmed',
                              encoding: 'base64',
                              ...(dataMode === 'skip' && { dataSlice: { length: 0, offset: 0 } }),
                          })
                          .send();

            for (let i = 0; i < batch.length; i++) {
                const pubkey = batch[i];
                const result = results[i];

                let account: Account;
                if (result === null) {
                    account = {
                        data: { raw: alloc(0) },
                        executable: false,
                        lamports: 0,
                        owner: SystemProgram.programId,
                        pubkey,
                        space: 0,
                    };
                } else {
                    let space: number | undefined = undefined;
                    let parsedData: ParsedData | undefined;
                    // jsonParsed answers with base64 data for any account its parsers don't cover,
                    // so an array here means "no parsed representation", not "raw mode".
                    if (!Array.isArray(result.data)) {
                        space = Number(result.data.space);
                        try {
                            parsedData = await handleParsedAccountData(rpc, result.data, result.lamports);
                        } catch (error) {
                            Logger.error(error, {
                                address: pubkey.toBase58(),
                                url,
                            });
                        }
                    }

                    // If we cannot parse account layout as native spl account
                    // then keep raw data for other components to decode
                    let rawData: Uint8Array | undefined;
                    if (!parsedData && Array.isArray(result.data) && dataMode !== 'skip') {
                        rawData = fromBase64(result.data[0]);
                        space = rawData.length;
                    }

                    account = {
                        data: {
                            parsed: parsedData,
                            raw: rawData,
                        },
                        executable: result.executable,
                        lamports: Number(result.lamports),
                        owner: toLegacyPublicKey(result.owner),
                        pubkey,
                        space,
                    };
                }

                const settle = (data: Account) =>
                    dispatch({
                        data,
                        key: pubkey.toBase58(),
                        status: FetchStatus.Fetched,
                        type: ActionType.Update,
                        url,
                    });

                const mint = fetchNftMetadata ? asMint(account) : undefined;
                if (mint === undefined) {
                    settle(account);
                } else {
                    // Not awaited: metadata costs two more round trips, and awaiting it inside the loop
                    // held back every account queued behind this one. Each mint settles once, with its
                    // metadata, so a refresh landing meanwhile is never overwritten by a stale replay.
                    pendingMetadata.push(
                        fetchNftData(pubkey, url, { onError: ex => Logger.error(ex) }).then(nftData =>
                            settle({ ...account, data: { ...account.data, parsed: { ...mint, nftData } } }),
                        ),
                    );
                }
            }
        } catch (error) {
            onError(error);

            for (const pubkey of batch) {
                dispatch({
                    key: pubkey.toBase58(),
                    status: FetchStatus.FetchFailed,
                    type: ActionType.Update,
                    url,
                });
            }
        }
    }

    // Reported, not thrown: this function is started from a timer, so a rejection would go unhandled.
    await Promise.all(pendingMetadata).catch(onError);
}

/** The account's parsed data when it is a token mint, which is the only kind that carries NFT metadata. */
function asMint(account: Account): TokenProgramData | undefined {
    const parsed = account.data.parsed;
    if (!parsed || !isTokenProgramData(parsed) || parsed.parsed.type !== 'mint') return undefined;
    return parsed;
}

// The kit-typed shape of a jsonParsed account's `data` when the RPC could parse it — the
// `[base64, 'base64']` tuple fallback is excluded (callers branch on `Array.isArray` first).
type ParsedAccountData = Exclude<AccountInfoWithJsonData['data'], readonly [string, string]>;

async function handleParsedAccountData(
    rpc: SolanaRpc,
    accountData: ParsedAccountData,
    lamports: bigint,
): Promise<ParsedData | undefined> {
    // kit upcasts every integral value in the jsonParsed payload to a bigint; the superstruct
    // validators below expect plain-JSON numbers.
    const info = create(withNumbersInsteadOfBigInts(accountData.parsed), ParsedInfo);
    // TODO: adopt @explorer/entity-inspector's accounts module (src/accounts: classifyAccountKindBase + kinds.ts; needs a browser-safe ./accounts subpath) instead of this inline kind switch
    switch (accountData.program) {
        case BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL: {
            const parsed = create(info, UpgradeableLoaderAccount);

            // Fetch program data to get program upgradeability info
            let programData: ProgramDataAccountInfo | undefined;
            if (parsed.type === 'program') {
                const { value: result } = await rpc
                    .getAccountInfo(toKitAddress(parsed.info.programData), {
                        commitment: 'confirmed',
                        encoding: 'jsonParsed',
                    })
                    .send();
                if (
                    result &&
                    !Array.isArray(result.data) &&
                    result.data.program === BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL
                ) {
                    const info = create(withNumbersInsteadOfBigInts(result.data.parsed), ParsedInfo);
                    programData = create(info, ProgramDataAccount).info;
                }
            }

            return {
                parsed,
                program: accountData.program,
                programData,
            };
        }

        case STAKE_PROGRAM_LABEL: {
            const parsed = create(info, StakeAccount);
            const stakeInfo = parsed.info;

            const activation =
                parsed.type === 'delegated' && stakeInfo.stake !== null
                    ? await getStakeActivation(rpc, {
                          delegation: stakeInfo.stake.delegation,
                          lamports,
                          rentExemptReserve: stakeInfo.meta.rentExemptReserve,
                      })
                    : undefined;
            return {
                activation: activation
                    ? {
                          active: Number(activation.active),
                          inactive: Number(activation.inactive),
                          state: activation.status,
                      }
                    : undefined,
                parsed,
                program: accountData.program,
            };
        }

        case VOTE_PROGRAM_LABEL: {
            return {
                parsed: create(info, VoteAccount),
                program: accountData.program,
            };
        }

        case NONCE_PROGRAM_LABEL: {
            return {
                parsed: create(info, NonceAccount),
                program: accountData.program,
            };
        }

        case SYSVAR_PROGRAM_LABEL: {
            return {
                parsed: create(info, SysvarAccount),
                program: accountData.program,
            };
        }

        case CONFIG_PROGRAM_LABEL: {
            return {
                parsed: create(info, ConfigAccount),
                program: accountData.program,
            };
        }

        case ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL: {
            const parsed = create(info, ParsedAddressLookupTableAccount);
            return {
                parsed,
                program: accountData.program,
            };
        }

        case SPL_TOKEN_PROGRAM_LABEL:
        case SPL_TOKEN_2022_PROGRAM_LABEL: {
            return {
                parsed: create(info, TokenAccount),
                program: accountData.program,
            };
        }
    }
}

export function useAccounts() {
    const context = React.useContext(StateContext);
    if (!context) {
        throw new Error(`useAccounts must be used within a AccountsProvider`);
    }
    return context.entries;
}

export function useAccountInfo(address: string | undefined): Cache.CacheEntry<Account> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useAccountInfo must be used within a AccountsProvider`);
    }
    return useCacheEntry(context.entries, address);
}

// An address with nothing in the cache yields undefined, as it always did — the old signature just did
// not say so.
export function useAccountInfos(addresses: string[]): (Cache.CacheEntry<Account> | undefined)[] {
    const context = React.useContext(StateContext);
    if (!context) {
        throw new Error(`useAccountInfos must be used within a AccountsProvider`);
    }
    return useCacheEntries(context.entries, addresses);
}

export function useMintAccountInfo(address: string | undefined): MintAccountInfo | undefined {
    const accountInfo = useAccountInfo(address);
    return React.useMemo(() => {
        if (address === undefined || accountInfo?.data === undefined) return;
        const account = accountInfo.data;

        try {
            const parsedData = account.data.parsed;
            if (!parsedData) return;
            if (!isTokenProgramData(parsedData) || parsedData.parsed.type !== 'mint') {
                return;
            }

            return create(parsedData.parsed.info, MintAccountInfo);
        } catch (err) {
            Logger.error(err, { address });
        }
    }, [address, accountInfo]);
}

export function useTokenAccountInfo(address: string | undefined): TokenAccountInfo | undefined {
    const accountInfo = useAccountInfo(address);
    return React.useMemo(() => {
        if (address === undefined || accountInfo?.data === undefined) return;
        const account = accountInfo.data;

        try {
            const parsedData = account.data.parsed;
            if (!parsedData) return;
            if (!isTokenProgramData(parsedData) || parsedData.parsed.type !== 'account') {
                return;
            }

            return create(parsedData.parsed.info, TokenAccountInfo);
        } catch (err) {
            Logger.error(err, { address });
        }
    }, [address, accountInfo]);
}

function parseAddressLookupTableFromCache(
    accountInfo: Cache.CacheEntry<Account> | undefined,
    address: string,
): [AddressLookupTableAccount | string | undefined, FetchStatus] | undefined {
    if (accountInfo === undefined) return;
    const account = accountInfo.data;
    if (account === undefined) return [account, accountInfo.status];
    if (account.lamports === 0) return ['Lookup Table Not Found', accountInfo.status];
    const { parsed: parsedData, raw: rawData } = account.data;

    const key = new PublicKey(address);
    if (parsedData && parsedData.program === ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL) {
        if (parsedData.parsed.type === 'lookupTable') {
            return [
                new AddressLookupTableAccount({
                    key,
                    state: parsedData.parsed.info,
                }),
                accountInfo.status,
            ];
        } else if (parsedData.parsed.type === 'uninitialized') {
            return ['Lookup Table Uninitialized', accountInfo.status];
        }
    } else if (rawData && account.owner.equals(AddressLookupTableProgram.programId)) {
        try {
            return [
                new AddressLookupTableAccount({
                    key,
                    state: AddressLookupTableAccount.deserialize(rawData),
                }),
                accountInfo.status,
            ];
        } catch {
            /* empty */
        }
    }

    return ['Invalid Lookup Table', accountInfo.status];
}

export function useAddressLookupTables(addresses: string[]) {
    const accountInfos = useAccountInfos(addresses);
    return React.useMemo(() => {
        return accountInfos.map((accountInfo, index) =>
            parseAddressLookupTableFromCache(accountInfo, addresses[index]),
        );
    }, [accountInfos, addresses]);
}

export function useAddressLookupTable(
    address: string,
): [AddressLookupTableAccount | string | undefined, FetchStatus] | undefined {
    const accountInfo = useAccountInfo(address);
    return React.useMemo(() => parseAddressLookupTableFromCache(accountInfo, address), [address, accountInfo]);
}

export function useFetchAccountInfo() {
    const fetchers = React.useContext(FetchersContext);
    if (!fetchers) {
        throw new Error(`useFetchAccountInfo must be used within a AccountsProvider`);
    }

    return React.useCallback(
        (pubkey: PublicKey, dataMode: FetchAccountDataMode) => {
            fetchers[dataMode].fetch(pubkey);
        },
        [fetchers],
    );
}
