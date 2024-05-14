'use client';

import { MetadataJson, programs } from '@metaplex/js';
import getEditionInfo, { EditionInfo } from '@providers/accounts/utils/getEditionInfo';
import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import {
    AddressLookupTableAccount,
    AddressLookupTableProgram,
    Connection,
    ParsedAccountData,
    PublicKey,
    StakeActivationData,
    SystemProgram,
} from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { pubkeyToString } from '@utils/index';
import { assertIsTokenProgram, TokenProgram } from '@utils/programs';
import { ParsedAddressLookupTableAccount } from '@validators/accounts/address-lookup-table';
import { ConfigAccount } from '@validators/accounts/config';
import { NonceAccount } from '@validators/accounts/nonce';
import { StakeAccount } from '@validators/accounts/stake';
import { SysvarAccount } from '@validators/accounts/sysvar';
import { MintAccountInfo, TokenAccount, TokenAccountInfo } from '@validators/accounts/token';
import {
    ProgramDataAccount,
    ProgramDataAccountInfo,
    UpgradeableLoaderAccount,
} from '@validators/accounts/upgradeable-program';
import { VoteAccount } from '@validators/accounts/vote';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';

import { HistoryProvider } from './history';
import { RewardsProvider } from './rewards';
import { TokensProvider } from './tokens';
export { useAccountHistory } from './history';

const Metadata = programs.metadata.Metadata;

export type StakeProgramData = {
    program: 'stake';
    parsed: StakeAccount;
    activation?: StakeActivationData;
};

export type UpgradeableLoaderAccountData = {
    program: 'bpf-upgradeable-loader';
    parsed: UpgradeableLoaderAccount;
    programData?: ProgramDataAccountInfo;
};

export type NFTData = {
    metadata: programs.metadata.MetadataData;
    json: MetadataJson | undefined;
    editionInfo: EditionInfo;
};

export function isTokenProgramData(data: { program: string }): data is TokenProgramData {
    try {
        assertIsTokenProgram(data.program);
        return true;
    } catch (e) {
        return false;
    }
}
export type TokenProgramData = {
    program: TokenProgram;
    parsed: TokenAccount;
    nftData?: NFTData;
};

export type VoteProgramData = {
    program: 'vote';
    parsed: VoteAccount;
};

export type NonceProgramData = {
    program: 'nonce';
    parsed: NonceAccount;
};

export type SysvarProgramData = {
    program: 'sysvar';
    parsed: SysvarAccount;
};

export type ConfigProgramData = {
    program: 'config';
    parsed: ConfigAccount;
};

export type AddressLookupTableProgramData = {
    program: 'address-lookup-table';
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
    raw?: Buffer;
}

export interface Account {
    pubkey: PublicKey;
    lamports: number;
    executable: boolean;
    owner: PublicKey;
    space?: number;
    data: AccountData;
}

type State = Cache.State<Account>;
type Dispatch = Cache.Dispatch<Account>;
type Fetchers = { [mode in FetchAccountDataMode]: MultipleAccountFetcher };

const FetchersContext = React.createContext<Fetchers | undefined>(undefined);
const StateContext = React.createContext<State | undefined>(undefined);
const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

class MultipleAccountFetcher {
    pubkeys: Set<string> = new Set();
    fetchTimeout?: NodeJS.Timeout;

    constructor(
        private dispatch: Dispatch,
        private cluster: Cluster,
        private url: string,
        private dataMode: FetchAccountDataMode
    ) {}
    fetch = (pubkey: PublicKey) => {
        if (this.pubkeys !== undefined) this.pubkeys.add(pubkey.toBase58());
        if (this.fetchTimeout === undefined) {
            this.fetchTimeout = setTimeout(() => {
                this.fetchTimeout = undefined;
                if (this.pubkeys !== undefined) {
                    const pubkeys = Array.from(this.pubkeys).map(p => new PublicKey(p));
                    this.pubkeys.clear();

                    const { dispatch, cluster, url, dataMode } = this;
                    fetchMultipleAccounts({ cluster, dataMode, dispatch, pubkeys, url });
                }
            }, 100);
        }
    };
}

export type FetchAccountDataMode = 'parsed' | 'raw' | 'skip';

type AccountsProviderProps = { children: React.ReactNode };
export function AccountsProvider({ children }: AccountsProviderProps) {
    const { cluster, url } = useCluster();
    const [state, dispatch] = Cache.useReducer<Account>(url);
    const [fetchers, setFetchers] = React.useState<Fetchers>(() => ({
        parsed: new MultipleAccountFetcher(dispatch, cluster, url, 'parsed'),
        raw: new MultipleAccountFetcher(dispatch, cluster, url, 'raw'),
        skip: new MultipleAccountFetcher(dispatch, cluster, url, 'skip'),
    }));

    // Clear accounts cache whenever cluster is changed
    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
        setFetchers({
            parsed: new MultipleAccountFetcher(dispatch, cluster, url, 'parsed'),
            raw: new MultipleAccountFetcher(dispatch, cluster, url, 'raw'),
            skip: new MultipleAccountFetcher(dispatch, cluster, url, 'skip'),
        });
    }, [dispatch, cluster, url]);

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
    cluster,
    url,
}: {
    dispatch: Dispatch;
    pubkeys: PublicKey[];
    dataMode: FetchAccountDataMode;
    cluster: Cluster;
    url: string;
}) {
    for (const pubkey of pubkeys) {
        dispatch({
            key: pubkey.toBase58(),
            status: Cache.FetchStatus.Fetching,
            type: ActionType.Update,
            url,
        });
    }

    const BATCH_SIZE = 100;
    const connection = new Connection(url, 'confirmed');

    let nextBatchStart = 0;
    while (nextBatchStart < pubkeys.length) {
        const batch = pubkeys.slice(nextBatchStart, nextBatchStart + BATCH_SIZE);
        nextBatchStart += BATCH_SIZE;

        try {
            let results;
            if (dataMode === 'parsed') {
                results = (await connection.getMultipleParsedAccounts(batch)).value;
            } else if (dataMode === 'raw') {
                results = await connection.getMultipleAccountsInfo(batch);
            } else {
                results = await connection.getMultipleAccountsInfo(batch, {
                    dataSlice: { length: 0, offset: 0 },
                });
            }

            for (let i = 0; i < batch.length; i++) {
                const pubkey = batch[i];
                const result = results[i];

                let account: Account;
                if (result === null) {
                    account = {
                        data: { raw: Buffer.alloc(0) },
                        executable: false,
                        lamports: 0,
                        owner: SystemProgram.programId,
                        pubkey,
                        space: 0,
                    };
                } else {
                    let space: number | undefined = undefined;
                    let parsedData: ParsedData | undefined;
                    if ('parsed' in result.data) {
                        const accountData: ParsedAccountData = result.data;
                        space = result.data.space;
                        try {
                            parsedData = await handleParsedAccountData(connection, pubkey, accountData);
                        } catch (error) {
                            console.error(error, { address: pubkey.toBase58(), url });
                        }
                    }

                    // If we cannot parse account layout as native spl account
                    // then keep raw data for other components to decode
                    let rawData: Buffer | undefined;
                    if (!parsedData && !('parsed' in result.data) && dataMode !== 'skip') {
                        space = result.data.length;
                        rawData = result.data;
                    }

                    account = {
                        data: {
                            parsed: parsedData,
                            raw: rawData,
                        },
                        executable: result.executable,
                        lamports: result.lamports,
                        owner: result.owner,
                        pubkey,
                        space,
                    };
                }

                dispatch({
                    data: account,
                    key: pubkey.toBase58(),
                    status: FetchStatus.Fetched,
                    type: ActionType.Update,
                    url,
                });
            }
        } catch (error) {
            if (cluster !== Cluster.Custom) {
                console.error(error, { url });
            }

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
}

async function handleParsedAccountData(
    connection: Connection,
    accountKey: PublicKey,
    accountData: ParsedAccountData
): Promise<ParsedData | undefined> {
    const info = create(accountData.parsed, ParsedInfo);
    switch (accountData.program) {
        case 'bpf-upgradeable-loader': {
            const parsed = create(info, UpgradeableLoaderAccount);

            // Fetch program data to get program upgradeability info
            let programData: ProgramDataAccountInfo | undefined;
            if (parsed.type === 'program') {
                const result = (await connection.getParsedAccountInfo(parsed.info.programData)).value;
                if (result && 'parsed' in result.data && result.data.program === 'bpf-upgradeable-loader') {
                    const info = create(result.data.parsed, ParsedInfo);
                    programData = create(info, ProgramDataAccount).info;
                }
            }

            return {
                parsed,
                program: accountData.program,
                programData,
            };
        }

        case 'stake': {
            const parsed = create(info, StakeAccount);
            const isDelegated = parsed.type === 'delegated';
            const activation = isDelegated ? await connection.getStakeActivation(accountKey) : undefined;

            return {
                activation,
                parsed,
                program: accountData.program,
            };
        }

        case 'vote': {
            return {
                parsed: create(info, VoteAccount),
                program: accountData.program,
            };
        }

        case 'nonce': {
            return {
                parsed: create(info, NonceAccount),
                program: accountData.program,
            };
        }

        case 'sysvar': {
            return {
                parsed: create(info, SysvarAccount),
                program: accountData.program,
            };
        }

        case 'config': {
            return {
                parsed: create(info, ConfigAccount),
                program: accountData.program,
            };
        }

        case 'address-lookup-table': {
            const parsed = create(info, ParsedAddressLookupTableAccount);
            return {
                parsed,
                program: accountData.program,
            };
        }

        case 'spl-token':
        case 'spl-token-2022': {
            const parsed = create(info, TokenAccount);
            let nftData;

            try {
                // Generate a PDA and check for a Metadata Account
                if (parsed.type === 'mint') {
                    const metadata = await Metadata.load(connection, await Metadata.getPDA(accountKey));
                    if (metadata) {
                        // We have a valid Metadata account. Try and pull edition data.
                        const editionInfo = await getEditionInfo(metadata, connection);
                        const id = pubkeyToString(accountKey);
                        const metadataJSON = await getMetaDataJSON(id, metadata.data);
                        nftData = {
                            editionInfo,
                            json: metadataJSON,
                            metadata: metadata.data,
                        };
                    }
                }
            } catch (error) {
                // unable to find NFT metadata account
            }

            return {
                nftData,
                parsed,
                program: accountData.program,
            };
        }
    }
}

const IMAGE_MIME_TYPE_REGEX = /data:image\/(svg\+xml|png|jpeg|gif)/g;

const getMetaDataJSON = async (
    id: string,
    metadata: programs.metadata.MetadataData
): Promise<MetadataJson | undefined> => {
    return new Promise(resolve => {
        const uri = metadata.data.uri;
        if (!uri) return resolve(undefined);

        const processJson = (extended: any) => {
            if (!extended || (!extended.image && extended?.properties?.files?.length === 0)) {
                return;
            }

            if (extended?.image) {
                extended.image =
                    extended.image.startsWith('http') || IMAGE_MIME_TYPE_REGEX.test(extended.image)
                        ? extended.image
                        : `${metadata.data.uri}/${extended.image}`;
            }

            return extended;
        };

        try {
            fetch(uri)
                .then(async _ => {
                    try {
                        const data = await _.json();
                        try {
                            localStorage.setItem(uri, JSON.stringify(data));
                        } catch {
                            // ignore
                        }
                        resolve(processJson(data));
                    } catch {
                        resolve(undefined);
                    }
                })
                .catch(() => {
                    resolve(undefined);
                });
        } catch (ex) {
            console.error(ex);
            resolve(undefined);
        }
    });
};

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
    if (address === undefined) return;
    return context.entries[address];
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
            console.error(err, { address });
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
            console.error(err, { address });
        }
    }, [address, accountInfo]);
}

export function useAddressLookupTable(
    address: string
): [AddressLookupTableAccount | string | undefined, FetchStatus] | undefined {
    const accountInfo = useAccountInfo(address);
    return React.useMemo(() => {
        if (accountInfo === undefined) return;
        const account = accountInfo.data;
        if (account === undefined) return [account, accountInfo.status];
        if (account.lamports === 0) return ['Lookup Table Not Found', accountInfo.status];
        const { parsed: parsedData, raw: rawData } = account.data;

        const key = new PublicKey(address);
        if (parsedData && parsedData.program === 'address-lookup-table') {
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
    }, [address, accountInfo]);
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
        [fetchers]
    );
}
