'use client';
import ScaledUiAmountMultiplierTooltip from '@components/account/token-extensions/ScaledUiAmountMultiplierTooltip';
import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { cn } from '@components/shared/utils';
import {
    deriveScaledUiAmountMultiplier,
    orderMintsByVerification,
    type TokenInfo,
    useTokenInfos,
} from '@entities/token-info';
import { TokenInfoWithPubkey, useAccountOwnedTokens, useFetchAccountOwnedTokens } from '@providers/accounts/tokens';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { BigNumber } from 'bignumber.js';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@/app/components/shared/ui/dropdown';
import { ProxiedImage } from '@/app/features/metadata';
import { Card, CardFooter, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

type Display = 'summary' | 'detail' | null;

// Holdings paginate independently of Token History (which stays at 4/4 in @/app/features/token-history/config).
// A single local declaration next to the only consumer - no shared feature module exists for holdings.
const HOLDINGS_INITIAL_VISIBLE_COUNT = 20;
const HOLDINGS_LOAD_MORE_COUNT = 20;

const useQueryDisplay = (): Display => {
    const searchParams = useSearchParams();
    const filter = searchParams?.get('display');
    if (filter === 'summary' || filter === 'detail') {
        return filter;
    } else {
        return null;
    }
};

/** `HoldingsCard` stays split out because its hooks may not sit behind the guards below. */
export function OwnedTokensCard({ address }: { address: string }) {
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const ownedTokens = useAccountOwnedTokens(address);
    const fetchAccountTokens = useFetchAccountOwnedTokens();
    const refresh = () => fetchAccountTokens(pubkey);
    const display = useQueryDisplay();

    // Fetch owned tokens
    useEffect(() => {
        if (!ownedTokens) refresh();
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

    if (ownedTokens === undefined) {
        return null;
    }

    const { status } = ownedTokens;
    const tokens = ownedTokens.data?.tokens;
    const fetching = status === FetchStatus.Fetching;
    if (fetching && (tokens === undefined || tokens.length === 0)) {
        return <LoadingCard message="Loading token holdings" />;
    } else if (tokens === undefined) {
        return <ErrorCard retry={refresh} text="Failed to fetch token holdings" />;
    }

    if (tokens.length === 0) {
        return <ErrorCard retry={refresh} retryText="Try Again" text={'No token holdings found'} />;
    }

    return <HoldingsCard display={display} tokens={tokens} />;
}

function HoldingsCard({ display, tokens }: { display: Display; tokens: TokenInfoWithPubkey[] }) {
    const { cluster, genesisHash } = useCluster();
    const [visibleCount, setVisibleCount] = useState(HOLDINGS_INITIAL_VISIBLE_COUNT);

    const holdings = useMemo(() => aggregateByMint(tokens), [tokens]);
    const mints = useMemo(() => Array.from(holdings.keys()), [holdings]);

    // Every mint, not just the visible ones: ordering needs each mint's verified status.
    const { isLoading, tokenInfos } = useTokenInfos(mints, cluster, genesisHash);

    // A permutation of `mints`, so its length is the distinct mint count the footer reports.
    const orderedMints = useMemo(() => orderMintsByVerification(mints, tokenInfos), [mints, tokenInfos]);

    // Hold the spinner rather than paint an arbitrary order that reshuffles a moment later.
    if (isLoading) {
        return <LoadingCard message="Loading token holdings" />;
    }

    return (
        <Card ui="dashkit">
            <CardHeader ui="dashkit">
                <CardTitle as="h3" ui="dashkit">
                    Token Holdings
                </CardTitle>
                <DisplayDropdown display={display} />
            </CardHeader>

            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px p-0 text-center text-dk-gray-700">
                            Logo
                        </BaseTable.HeaderCell>
                        {display === 'detail' && (
                            <BaseTable.HeaderCell className="text-dk-gray-700">Account Address</BaseTable.HeaderCell>
                        )}
                        <BaseTable.HeaderCell className="text-dk-gray-700">Mint Address</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">
                            {display === 'detail' ? 'Total Balance' : 'Balance'}
                        </BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {orderedMints.slice(0, visibleCount).map(mintAddress => {
                        const token = holdings.get(mintAddress);
                        return token ? (
                            <TokenRow
                                key={mintAddress}
                                mintAddress={mintAddress}
                                showAccountAddress={display === 'detail'}
                                token={token}
                                tokenInfo={tokenInfos.get(mintAddress)}
                            />
                        ) : null;
                    })}
                </BaseTable.Body>
            </BaseTable>
            <TokensCardFooter
                loadMore={() => setVisibleCount(count => count + HOLDINGS_LOAD_MORE_COUNT)}
                totalCount={orderedMints.length}
                visibleCount={visibleCount}
            />
        </Card>
    );
}

type MappedToken = {
    amount: string;
    decimals: number;
    pubkey: string;
    rawAmount: string;
    scaledUiAmountMultiplier: string;
};

/** Insertion order is RPC order, which the verification tiering preserves within a tier. */
function aggregateByMint(tokens: TokenInfoWithPubkey[]): Map<string, MappedToken> {
    const byMint = new Map<string, MappedToken>();

    for (const { info: token, pubkey } of tokens) {
        const mintAddress = token.mint.toBase58();
        const existing = byMint.get(mintAddress);
        const decimals = token.tokenAmount.decimals;

        let amount = token.tokenAmount.uiAmountString;
        // Accumulated alongside `amount` so the tooltip's pre-scaling value matches the total the row renders.
        let rawAmount = token.tokenAmount.amount;
        if (existing) {
            amount = new BigNumber(existing.amount).plus(token.tokenAmount.uiAmountString).toString();
            rawAmount = new BigNumber(existing.rawAmount).plus(token.tokenAmount.amount).toString();
        }

        byMint.set(mintAddress, {
            amount,
            decimals,
            pubkey: pubkey.toBase58(),
            rawAmount,
            // Multiplier is a per-mint ratio, so one account's raw/ui pair is enough to derive it.
            scaledUiAmountMultiplier: deriveScaledUiAmountMultiplier(
                token.tokenAmount.amount,
                decimals,
                token.tokenAmount.uiAmountString,
            ),
        });
    }

    return byMint;
}

type TokenRowProps = {
    mintAddress: string;
    showAccountAddress: boolean;
    token: MappedToken;
    tokenInfo: TokenInfo | undefined;
};

function TokenRow({ mintAddress, showAccountAddress, token, tokenInfo }: TokenRowProps) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell className="w-px p-0 text-center">
                <ProxiedImage
                    alt="Token icon"
                    className="h-6 w-6 rounded-full border-4 border-solid border-dk-gray-700-dark"
                    height={16}
                    uri={tokenInfo?.logoURI ?? undefined}
                    width={16}
                />
            </BaseTable.Cell>
            {showAccountAddress && (
                <BaseTable.Cell>
                    <Address pubkey={new PublicKey(token.pubkey)} link />
                </BaseTable.Cell>
            )}
            <BaseTable.Cell>
                <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={tokenInfo} />
            </BaseTable.Cell>
            <BaseTable.Cell>
                {token.amount} {tokenInfo?.symbol}
                <ScaledUiAmountMultiplierTooltip
                    rawAmount={new BigNumber(token.rawAmount).shiftedBy(-(token.decimals || 0)).toString()}
                    scaledUiAmountMultiplier={token.scaledUiAmountMultiplier}
                />
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}

function TokensCardFooter({
    loadMore,
    totalCount,
    visibleCount,
}: {
    loadMore: () => void;
    totalCount: number;
    visibleCount: number;
}) {
    if (visibleCount >= totalCount) {
        return null;
    }

    return (
        <CardFooter ui="dashkit">
            <Button ui="dashkit" variant="primary" className="w-full" onClick={loadMore}>
                Load More ({visibleCount} of {totalCount})
            </Button>
        </CardFooter>
    );
}

type DropdownProps = {
    display: Display;
};

const DisplayDropdown = ({ display }: DropdownProps) => {
    const currentSearchParams = useSearchParams();
    const currentPath = usePathname();
    const buildLocation = useCallback(
        (display: Display) => {
            const params = new URLSearchParams(currentSearchParams?.toString());
            if (display === null) {
                params.delete('display');
            } else {
                params.set('display', display);
            }
            const nextQueryString = params.toString();
            return `${currentPath}${nextQueryString ? `?${nextQueryString}` : ''}`;
        },
        [currentPath, currentSearchParams],
    );

    const DISPLAY_OPTIONS: Display[] = [null, 'detail'];
    return (
        <Dropdown>
            <DropdownToggle asChild>
                <Button ui="dashkit" variant="white" size="sm" type="button">
                    {display === 'detail' ? 'Detailed' : 'Summary'} <ChevronDown size={15} className="align-text-top" />
                </Button>
            </DropdownToggle>
            <DropdownMenu align="end">
                {DISPLAY_OPTIONS.map(displayOption => {
                    return (
                        <DropdownItem
                            asChild
                            key={displayOption || 'null'}
                            className={cn(displayOption === display && 'active')}
                        >
                            <Link href={buildLocation(displayOption)}>
                                {displayOption === 'detail' ? 'Detailed' : 'Summary'}
                            </Link>
                        </DropdownItem>
                    );
                })}
            </DropdownMenu>
        </Dropdown>
    );
};
