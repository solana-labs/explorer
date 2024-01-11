import { ProgramLogsCardBody } from '@components/ProgramLogsCardBody';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@providers/accounts/tokens';
import { useCluster } from '@providers/cluster';
import { AccountLayout, MintLayout } from "@solana/spl-token";
import { AccountInfo, AddressLookupTableAccount, Connection, MessageAddressTableLookup, ParsedAccountData, ParsedMessageAccount, SimulatedTransactionAccountInfo, TokenBalance, VersionedMessage, VersionedTransaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { InstructionLogs, parseProgramLogs } from '@utils/program-logs';
import React from 'react';

import { generateTokenBalanceRows,TokenBalancesCardInner, TokenBalancesCardInnerProps } from '../transaction/TokenBalancesCard';

export function SimulatorCard({ message, showTokenBalanceChanges }: { message: VersionedMessage; showTokenBalanceChanges: boolean }) {
    const { cluster, url } = useCluster();
    const { simulate, simulating, simulationLogs: logs, simulationError, simulationTokenBalanceRows } = useSimulator(message);
    if (simulating) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3 className="card-header-title">Transaction Simulation</h3>
                </div>
                <div className="card-body text-center">
                    <span className="spinner-grow spinner-grow-sm me-2"></span>
                    Simulating
                </div>
            </div>
        );
    } else if (!logs) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3 className="card-header-title">Transaction Simulation</h3>
                    <button className="btn btn-sm d-flex btn-white" onClick={simulate}>
                        {simulationError ? 'Retry' : 'Simulate'}
                    </button>
                </div>
                <div className="card-body">
                    {simulationError ? (
                        <>
                            Simulation Failure:
                            <span className="text-warning ms-2">{simulationError}</span>
                        </>
                    ) : (
                        <ul className="text-muted">
                            <li>
                                Simulation is free and will run this transaction against the latest confirmed ledger
                                state.
                            </li>
                            <li>No state changes will be persisted and all signature checks will be disabled.</li>
                        </ul>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-header-title">Transaction Simulation</h3>
                    <button className="btn btn-sm d-flex btn-white" onClick={simulate}>
                        Retry
                    </button>
                </div>
                <ProgramLogsCardBody message={message} logs={logs} cluster={cluster} url={url} />
            </div>
            {showTokenBalanceChanges && simulationTokenBalanceRows && !simulationError && simulationTokenBalanceRows.rows.length ? (
                <TokenBalancesCardInner rows={simulationTokenBalanceRows.rows} />
            ) : null}
        </>
    );
}

function useSimulator(message: VersionedMessage) {
    const { cluster, url } = useCluster();
    const [simulating, setSimulating] = React.useState(false);
    const [logs, setLogs] = React.useState<Array<InstructionLogs> | null>(null);
    const [error, setError] = React.useState<string>();
    const [tokenBalanceRows, setTokenBalanceRows] = React.useState<TokenBalancesCardInnerProps>();

    React.useEffect(() => {
        setLogs(null);
        setSimulating(false);
        setError(undefined);
    }, [url]);

    const onClick = React.useCallback(() => {
        if (simulating) return;
        setError(undefined);
        setSimulating(true);

        const connection = new Connection(url, 'confirmed');
        (async () => {
            try {
                const addressTableLookups: MessageAddressTableLookup[] = message.addressTableLookups;
                const addressTableLookupKeys: PublicKey[] = addressTableLookups.map((addressTableLookup: MessageAddressTableLookup) => {
                    return addressTableLookup.accountKey;
                });
                const addressTableLookupsFetched: (AccountInfo<Buffer> | null)[] = await connection.getMultipleAccountsInfo(addressTableLookupKeys);
                const nonNullAddressTableLookups: AccountInfo<Buffer>[] = addressTableLookupsFetched.filter((o): o is AccountInfo<Buffer> => !!o);

                const addressLookupTablesParsed: AddressLookupTableAccount[] = nonNullAddressTableLookups.map((addressTableLookup: AccountInfo<Buffer>, index) => {
                    return new AddressLookupTableAccount({
                        key: addressTableLookupKeys[index],
                        state: AddressLookupTableAccount.deserialize(addressTableLookup.data)
                    });
                })

                // Fetch all the accounts before simulating
                const accountKeys = message.getAccountKeys({
                    addressLookupTableAccounts: addressLookupTablesParsed,
                }).staticAccountKeys;
                const parsedAccountsPre = await connection.getMultipleParsedAccounts(accountKeys);

                // Simulate without signers to skip signer verification. Request
                // all account data after the simulation.
                const resp = await connection.simulateTransaction(new VersionedTransaction(message), {
                    accounts: {
                        addresses: accountKeys.map(function (key) {
                            return key.toBase58();
                        }),
                        encoding: 'base64',
                    },
                    replaceRecentBlockhash: true,
                });

                const mintToDecimals: { [mintPk: string]: number} =  getMintDecimals(
                    accountKeys,
                    parsedAccountsPre.value,
                    resp.value.accounts as SimulatedTransactionAccountInfo[],
                )

                const preTokenBalances: TokenBalance[] = [];
                const postTokenBalances: TokenBalance[] = [];
                const tokenAccountKeys: ParsedMessageAccount[] = [];

                for (let index = 0; index < accountKeys.length; index++) {
                    const key = accountKeys[index];
                    const parsedAccountPre = parsedAccountsPre.value[index];
                    const accountDataPost = resp.value.accounts?.at(index)?.data[0];
                    const accountOwnerPost = resp.value.accounts?.at(index)?.owner;

                    if (
                        parsedAccountPre &&
                        isTokenProgramBase58(parsedAccountPre.owner.toBase58()) &&
                        (parsedAccountPre.data as ParsedAccountData).parsed.type === 'account'
                    ) {
                        const mint = (parsedAccountPre?.data as ParsedAccountData).parsed.info.mint;
                        const owner = (parsedAccountPre?.data as ParsedAccountData).parsed.info.owner;
                        const tokenAmount = (parsedAccountPre?.data as ParsedAccountData).parsed.info.tokenAmount;
                        const preTokenBalance = {
                            accountIndex: tokenAccountKeys.length,
                            mint: mint,
                            owner: owner,
                            uiTokenAmount: tokenAmount,
                        };
                        preTokenBalances.push(preTokenBalance);
                    }

                    if (
                        accountOwnerPost &&
                        isTokenProgramBase58(accountOwnerPost) &&
                        Buffer.from(accountDataPost!, 'base64').length >= 165
                    ) {
                        const accountParsedPost = AccountLayout.decode(Buffer.from(accountDataPost!, 'base64'));
                        const mint = new PublicKey(accountParsedPost.mint);
                        const owner = new PublicKey(accountParsedPost.owner);
                        const postRawAmount = Number(accountParsedPost.amount.readBigUInt64LE(0));

                        const decimals = mintToDecimals[mint.toBase58()];
                        const tokenAmount = postRawAmount / 10 ** decimals;

                        const postTokenBalance = {
                            accountIndex: tokenAccountKeys.length,
                            mint: mint.toBase58(),
                            owner: owner.toBase58(),
                            uiTokenAmount: {
                                amount: postRawAmount.toString(),
                                decimals: decimals,
                                uiAmount: tokenAmount,
                                uiAmountString: tokenAmount.toString(),
                            },
                        };
                        postTokenBalances.push(postTokenBalance);
                    }
                    // All fields are ignored other than key, so set placeholders.
                    const parsedMessageAccount = {
                        pubkey: key,
                        signer: false,
                        writable: true,
                    };
                    tokenAccountKeys.push(parsedMessageAccount);
                }

                const tokenBalanceRows = generateTokenBalanceRows(
                    preTokenBalances,
                    postTokenBalances,
                    tokenAccountKeys
                );
                if (tokenBalanceRows) {
                    setTokenBalanceRows({ rows: tokenBalanceRows });
                }

                if (resp.value.logs === null) {
                    throw new Error('Expected to receive logs from simulation');
                }

                if (resp.value.logs.length === 0 && typeof resp.value.err === 'string') {
                    setLogs(null);
                    setError(resp.value.err);
                } else {
                    // Prettify logs
                    setLogs(parseProgramLogs(resp.value.logs, resp.value.err, cluster));
                }
                // If the response has an error, the logs will say what it it, so no need to parse here.
                if (resp.value.err) {
                    setError('TransactionError');
                }
            } catch (err) {
                console.error(err);
                setLogs(null);
                if (err instanceof Error) {
                    setError(err.message);
                }
            } finally {
                setSimulating(false);
            }
        })();
    }, [cluster, url, message, simulating]);
    return {
        simulate: onClick,
        simulating,
        simulationError: error,
        simulationLogs: logs,
        simulationTokenBalanceRows: tokenBalanceRows,
    };
}

function isTokenProgramBase58(programIdBase58: string): boolean {
    return programIdBase58 === TOKEN_PROGRAM_ID.toBase58() || programIdBase58 === TOKEN_2022_PROGRAM_ID.toBase58();
}

function getMintDecimals(
    accountKeys: PublicKey[],
    parsedAccountsPre: (AccountInfo<ParsedAccountData | Buffer> | null)[],
    accountDatasPost: SimulatedTransactionAccountInfo[]
): { [mintPk: string]: number} {
    const mintToDecimals: { [mintPk: string]: number } = {};
    // Get all the necessary mint decimals by looking at parsed token accounts
    // and mints before, as well as mints after.
    for (let index = 0; index < accountKeys.length; index++) {
        const parsedAccount = parsedAccountsPre[index];
        const key = accountKeys[index];

        // Token account before
        if (
            parsedAccount &&
            isTokenProgramBase58(parsedAccount.owner.toBase58()) &&
            (parsedAccount.data as ParsedAccountData).parsed.type === 'account'
        ) {
            mintToDecimals[(parsedAccount?.data as ParsedAccountData).parsed.info.mint] = (
                parsedAccount?.data as ParsedAccountData
            ).parsed.info.tokenAmount.decimals;
        }
        // Mint account before
        if (
            parsedAccount &&
            isTokenProgramBase58(parsedAccount.owner.toBase58()) &&
            (parsedAccount?.data as ParsedAccountData).parsed.type === 'mint'
        ) {
            mintToDecimals[key.toBase58()] = (parsedAccount?.data as ParsedAccountData).parsed.info.decimals;
        }

        // Token account after
        const accountDataPost = accountDatasPost.at(index)?.data[0];
        const accountOwnerPost = accountDatasPost.at(index)?.owner;
        if (accountOwnerPost && isTokenProgramBase58(accountOwnerPost) && Buffer.from(accountDataPost!, 'base64').length === 82) {
            const accountParsedPost = MintLayout.decode(Buffer.from(accountDataPost!, 'base64'));
            mintToDecimals[key.toBase58()] = accountParsedPost.decimals;
        }
    }

    return mintToDecimals;
}
