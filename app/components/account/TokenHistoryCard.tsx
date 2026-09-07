'use client';

import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { InstructionDetails } from '@components/common/InstructionDetails';
import { LoadingCard } from '@components/common/LoadingCard';
import { Signature } from '@components/common/Signature';
import { Slot } from '@components/common/Slot';
import {
    isTokenLendingInstruction,
    parseTokenLendingInstructionTitle,
} from '@components/instruction/token-lending/types';
import { isTokenSwapInstruction, parseTokenSwapInstructionTitle } from '@components/instruction/token-swap/types';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { cn } from '@components/shared/utils';
import { useTokenInfo } from '@entities/token-info';
import { isMangoInstruction, parseMangoInstructionTitle } from '@explorer/decoder-mango/detection';
import { isSerumInstruction, parseSerumInstructionTitle } from '@explorer/decoder-serum/detection';
import { useAccountHistories } from '@features/transaction-history/model/use-account-history';
import { useFetchAccountHistory } from '@features/transaction-history/model/use-fetch-account-history';
import { isTokenProgramData } from '@providers/accounts';
import { isTokenProgramId, TokenInfoWithPubkey, useAccountOwnedTokens } from '@providers/accounts/tokens';
import { CacheEntry, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Details, useFetchTransactionDetails, useTransactionDetailsCache } from '@providers/transactions/parsed';
import { ConfirmedSignatureInfo, ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { INNER_INSTRUCTIONS_START_SLOT } from '@utils/index';
import { getTokenProgramInstructionName, InstructionType } from '@utils/instruction';
import { displayAddress, intoTransactionInstruction, TokenLabelInfo } from '@utils/tx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback } from 'react';
import { ChevronDown } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { INITIAL_TOKENS_TO_FETCH, INITIAL_VISIBLE_COUNT, LOAD_MORE_COUNT } from '@/app/features/token-history/config';
import { Logger } from '@/app/shared/lib/logger';
import { toKitAddress } from '@/app/shared/lib/web3js-compat';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

const TRUNCATE_TOKEN_LENGTH = 10;
const ALL_TOKENS = '';

export function TokenHistoryCard({ address }: { address: string }) {
    const ownedTokens = useAccountOwnedTokens(address);

    if (ownedTokens === undefined) {
        return null;
    }

    const tokens = ownedTokens.data?.tokens;
    if (tokens === undefined || tokens.length === 0) return null;

    if (tokens.length > 25) {
        return <ErrorCard text="Token transaction history is not available for accounts with over 25 token accounts" />;
    }

    return <TokenHistoryTable tokens={tokens} />;
}

const useQueryFilter = (): string => {
    const searchParams = useSearchParams();
    const filter = searchParams?.get('filter');
    return filter || '';
};

type FilterProps = {
    filter: string;
    tokens: TokenInfoWithPubkey[];
};

function TokenHistoryTable({ tokens }: { tokens: TokenInfoWithPubkey[] }) {
    const accountHistories = useAccountHistories();
    const fetchAccountHistory = useFetchAccountHistory();
    const transactionDetailsCache = useTransactionDetailsCache();
    const [tokensToFetchCount, setTokensToFetchCount] = React.useState(INITIAL_TOKENS_TO_FETCH);
    const [visibleTxCount, setVisibleTxCount] = React.useState(INITIAL_VISIBLE_COUNT);
    const filter = useQueryFilter();

    const filteredTokens = React.useMemo(
        () =>
            tokens.filter(token => {
                if (filter === ALL_TOKENS) {
                    return true;
                }
                return token.info.mint.toBase58() === filter;
            }),
        [tokens, filter],
    );

    // Slice tokens - this controls what gets fetched
    const tokensToFetch = React.useMemo(
        () => filteredTokens.slice(0, tokensToFetchCount),
        [filteredTokens, tokensToFetchCount],
    );

    const fetchHistories = React.useCallback(
        (refresh?: boolean) => {
            tokensToFetch.forEach(token => {
                fetchAccountHistory(toKitAddress(token.pubkey), false, refresh);
            });
        },
        [tokensToFetch, fetchAccountHistory],
    );

    // Fetch histories when tokensToFetch expands (user clicks Load More)
    const prevTokensToFetchCount = React.useRef(0);
    React.useEffect(() => {
        if (prevTokensToFetchCount.current < tokensToFetchCount) {
            // Only fetch newly added tokens
            const newTokens = tokensToFetch.slice(prevTokensToFetchCount.current);
            newTokens.forEach(token => {
                const address = token.pubkey.toBase58();
                if (!accountHistories[address]) {
                    fetchAccountHistory(toKitAddress(token.pubkey), false, true);
                }
            });
            prevTokensToFetchCount.current = tokensToFetchCount;
        }
    }, [tokensToFetchCount, tokensToFetch, accountHistories, fetchAccountHistory]);

    const allFoundOldest = tokensToFetch.every(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.data?.foundOldest === true;
    });

    const allFetchedSome = tokensToFetch.every(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.data !== undefined;
    });

    // Find the oldest slot which we know we have the full history for
    let oldestSlot: number | undefined = allFoundOldest ? 0 : undefined;

    if (!allFoundOldest && allFetchedSome) {
        tokensToFetch.forEach(token => {
            const history = accountHistories[token.pubkey.toBase58()];
            if (history?.data?.foundOldest === false) {
                const earliest = history.data.fetched[history.data.fetched.length - 1].slot;
                if (!oldestSlot) oldestSlot = earliest;
                oldestSlot = Math.max(oldestSlot, earliest);
            }
        });
    }

    const fetching = tokensToFetch.some(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.status === FetchStatus.Fetching;
    });

    const failed = tokensToFetch.some(token => {
        const history = accountHistories[token.pubkey.toBase58()];
        return history?.status === FetchStatus.FetchFailed;
    });

    const sigSet = new Set();
    const mintAndTxs = tokensToFetch
        .map(token => ({
            history: accountHistories[token.pubkey.toBase58()],
            mint: token.info.mint,
        }))
        .filter(({ history }) => {
            return history?.data?.fetched && history.data.fetched.length > 0;
        })
        .flatMap(({ mint, history }) =>
            (history?.data?.fetched as ConfirmedSignatureInfo[]).map(tx => ({
                mint,
                tx,
            })),
        )
        .filter(({ tx }) => {
            if (sigSet.has(tx.signature)) return false;
            sigSet.add(tx.signature);
            return true;
        })
        .filter(({ tx }) => {
            return oldestSlot !== undefined && tx.slot >= oldestSlot;
        });

    if (mintAndTxs.length === 0) {
        if (fetching) {
            return <LoadingCard message="Loading history" />;
        } else if (failed) {
            return <ErrorCard retry={() => fetchHistories(true)} text="Failed to fetch transaction history" />;
        }
        if (tokensToFetchCount === 0) {
            return (
                <Card ui="dashkit">
                    <CardHeader ui="dashkit">
                        <CardTitle as="h3" ui="dashkit">
                            Token History
                        </CardTitle>
                    </CardHeader>
                    <CardBody ui="dashkit">
                        <p className="mb-0 text-center text-dk-gray-700">
                            Click the button below to load token transaction history
                        </p>
                    </CardBody>
                    <CardFooter ui="dashkit">
                        <Button
                            ui="dashkit"
                            variant="primary"
                            className="w-full"
                            onClick={() => setTokensToFetchCount(LOAD_MORE_COUNT)}
                        >
                            Load Token History
                        </Button>
                    </CardFooter>
                </Card>
            );
        }
        return (
            <ErrorCard retry={() => fetchHistories(true)} retryText="Try again" text="No transaction history found" />
        );
    }

    mintAndTxs.sort((a, b) => {
        if (a.tx.slot > b.tx.slot) return -1;
        if (a.tx.slot < b.tx.slot) return 1;
        return 0;
    });

    return (
        <Card ui="dashkit">
            <CardHeader ui="dashkit">
                <CardTitle as="h3" ui="dashkit">
                    Token History
                </CardTitle>
                <FilterDropdown filter={filter} tokens={tokens} />
                <RefreshButton
                    analyticsSection="token_history_card"
                    onClick={() => fetchHistories(true)}
                    fetching={fetching}
                />
            </CardHeader>

            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px text-dk-gray-700">Slot</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Result</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Token</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Instruction Type</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Transaction Signature</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {mintAndTxs.slice(0, visibleTxCount).map(({ mint, tx }) => (
                        <TokenTransactionRow
                            key={tx.signature}
                            mint={mint}
                            tx={tx}
                            details={transactionDetailsCache[tx.signature]}
                        />
                    ))}
                </BaseTable.Body>
            </BaseTable>

            <CardFooter ui="dashkit">
                {visibleTxCount < mintAndTxs.length ? (
                    <Button
                        ui="dashkit"
                        variant="primary"
                        className="w-full"
                        onClick={() => setVisibleTxCount(c => c + LOAD_MORE_COUNT)}
                    >
                        {`Show More (${visibleTxCount} of ${mintAndTxs.length})`}
                    </Button>
                ) : tokensToFetchCount < filteredTokens.length ? (
                    <Button
                        ui="dashkit"
                        variant="primary"
                        className="w-full"
                        onClick={() => setTokensToFetchCount(c => c + LOAD_MORE_COUNT)}
                        disabled={fetching}
                    >
                        {fetching ? (
                            <>
                                <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                                Loading
                            </>
                        ) : (
                            `Load More Token Accounts (${tokensToFetchCount} of ${filteredTokens.length})`
                        )}
                    </Button>
                ) : allFoundOldest ? (
                    <div className="text-center text-dk-gray-700">Fetched full history</div>
                ) : (
                    <Button
                        ui="dashkit"
                        variant="primary"
                        className="w-full"
                        onClick={() => fetchHistories()}
                        disabled={fetching}
                    >
                        {fetching ? (
                            <>
                                <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                                Loading
                            </>
                        ) : (
                            'Load More History'
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

// Resolves one mint's label through the batch provider, which coalesces the dropdown's mints into one
// POST and skips a mint it has already resolved. The holdings card resolves its own list separately, so
// a mint on both pays for two lookups.
function TokenFilterLabel({ mint }: { mint: string }) {
    const { cluster, genesisHash } = useCluster();
    const info = useTokenInfo(true, mint, cluster, genesisHash);
    return <>{formatTokenName(mint, cluster, info)}</>;
}

export function FilterDropdown({ filter, tokens }: FilterProps) {
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    const buildLocation = useCallback(
        (filter: string) => {
            const params = new URLSearchParams(currentSearchParams?.toString());
            if (filter === ALL_TOKENS) {
                params.delete('filter');
            } else {
                params.set('filter', filter);
            }
            const nextQueryString = params.toString();
            return `${currentPathname}${nextQueryString ? `?${nextQueryString}` : ''}`;
        },
        [currentPathname, currentSearchParams],
    );

    const filterOptions = React.useMemo(
        () => [ALL_TOKENS, ...new Set(tokens.map(token => token.info.mint.toBase58()))],
        [tokens],
    );

    return (
        <Dropdown className="mr-1.5">
            <small className="mr-1.5">Filter:</small>
            <DropdownToggle asChild>
                <Button ui="dashkit" variant="white" size="sm" type="button">
                    {filter === ALL_TOKENS ? 'All Tokens' : <TokenFilterLabel mint={filter} />}{' '}
                    <ChevronDown size={15} className="align-text-top" />
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end" className="max-h-80 overflow-y-auto">
                {filterOptions.map(filterOption => {
                    return (
                        <DropdownItem asChild key={filterOption} className={cn(filterOption === filter && 'active')}>
                            <Link href={buildLocation(filterOption)}>
                                {filterOption === ALL_TOKENS ? 'All Tokens' : <TokenFilterLabel mint={filterOption} />}
                            </Link>
                        </DropdownItem>
                    );
                })}
            </DropdownMenu>
        </Dropdown>
    );
}

const TokenTransactionRow = React.memo(function TokenTransactionRow({
    mint,
    tx,
    details,
}: {
    mint: PublicKey;
    tx: ConfirmedSignatureInfo;
    details: CacheEntry<Details> | undefined;
}) {
    let statusText: string;
    let statusClass: 'success' | 'warning';
    if (tx.err) {
        statusClass = 'warning';
        statusText = 'Failed';
    } else {
        statusClass = 'success';
        statusText = 'Success';
    }

    return (
        <tr key={tx.signature}>
            <td className="w-px">
                <Slot slot={tx.slot} link />
            </td>

            <td>
                <Badge ui="dashkit" variant={statusClass}>
                    {statusText}
                </Badge>
            </td>

            <td>
                <Address pubkey={mint} link />
            </td>

            <InstructionDetailsCell signature={tx.signature} details={details} tx={tx} />

            <td>
                <Signature signature={tx.signature} link />
            </td>
        </tr>
    );
});

function formatTokenName(pubkey: string, cluster: Cluster, tokenInfo?: TokenLabelInfo): string {
    let display = displayAddress(pubkey, cluster, tokenInfo);

    if (display === pubkey) {
        display = `${display.slice(0, TRUNCATE_TOKEN_LENGTH)}\u2026`;
    }

    return display;
}

function InstructionDetailsCell({
    signature,
    details,
    tx,
}: {
    signature: string;
    details: CacheEntry<Details> | undefined;
    tx: ConfirmedSignatureInfo;
}) {
    const fetchDetails = useFetchTransactionDetails();
    const { cluster } = useCluster();

    const handleLoadClick = React.useCallback(() => {
        fetchDetails(signature);
    }, [fetchDetails, signature]);

    const isFetching = details?.status === FetchStatus.Fetching;
    const hasFailed = details?.status === FetchStatus.FetchFailed;
    const transactionWithMeta = details?.data?.transactionWithMeta;
    const instructions = transactionWithMeta?.transaction.message.instructions;

    if (!details) {
        return (
            <td>
                <Button ui="dashkit" variant="outline-primary" size="sm" className="px-[3px] py-0 leading-none" asChild>
                    <span role="button" onClick={handleLoadClick}>
                        Load
                    </span>
                </Button>
            </td>
        );
    }

    if (isFetching) {
        return (
            <td>
                <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                Loading
            </td>
        );
    }

    if (hasFailed || !instructions) {
        return (
            <td>
                <Button ui="dashkit" variant="outline-warning" size="sm" className="px-[3px] py-0 leading-none" asChild>
                    <span role="button" onClick={handleLoadClick}>
                        Retry
                    </span>
                </Button>
            </td>
        );
    }

    const tokenInstructionNames = instructions
        .map((ix, index): InstructionType | undefined => {
            let name = 'Unknown';

            const innerInstructions: (ParsedInstruction | PartiallyDecodedInstruction)[] = [];

            if (
                transactionWithMeta.meta?.innerInstructions &&
                (cluster !== Cluster.MainnetBeta || transactionWithMeta.slot >= INNER_INSTRUCTIONS_START_SLOT)
            ) {
                transactionWithMeta.meta.innerInstructions.forEach(innerIx => {
                    if (innerIx.index === index) {
                        innerIx.instructions.forEach(inner => {
                            innerInstructions.push(inner);
                        });
                    }
                });
            }

            let transactionInstruction;
            if (transactionWithMeta?.transaction) {
                transactionInstruction = intoTransactionInstruction(transactionWithMeta.transaction, ix);
            }

            if ('parsed' in ix) {
                if (isTokenProgramData(ix)) {
                    name = getTokenProgramInstructionName(ix, tx);
                } else {
                    return undefined;
                }
            } else if (transactionInstruction && isSerumInstruction(transactionInstruction)) {
                try {
                    name = parseSerumInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else if (transactionInstruction && isTokenSwapInstruction(transactionInstruction)) {
                try {
                    name = parseTokenSwapInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else if (transactionInstruction && isTokenLendingInstruction(transactionInstruction)) {
                try {
                    name = parseTokenLendingInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else if (transactionInstruction && isMangoInstruction(transactionInstruction)) {
                try {
                    name = parseMangoInstructionTitle(transactionInstruction);
                } catch (error) {
                    Logger.error(error, {
                        signature: tx.signature,
                    });
                    return undefined;
                }
            } else {
                if (ix.accounts.findIndex(account => isTokenProgramId(account)) >= 0) {
                    name = 'Unknown (Inner)';
                } else {
                    return undefined;
                }
            }

            return {
                innerInstructions,
                name,
            };
        })
        .filter((item): item is InstructionType => item !== undefined);

    return (
        <td>
            {tokenInstructionNames.map((instructionType, index) => (
                <InstructionDetails key={index} instructionType={instructionType} tx={tx} />
            ))}
        </td>
    );
}
