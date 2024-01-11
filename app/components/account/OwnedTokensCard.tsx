'use client';

import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { Identicon } from '@components/common/Identicon';
import { LoadingCard } from '@components/common/LoadingCard';
import { TokenInfoWithPubkey, useAccountOwnedTokens, useFetchAccountOwnedTokens } from '@providers/accounts/tokens';
import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { BigNumber } from 'bignumber.js';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';
import { ChevronDown } from 'react-feather';

type Display = 'summary' | 'detail' | null;

const SMALL_IDENTICON_WIDTH = 16;

const useQueryDisplay = (): Display => {
    const searchParams = useSearchParams();
    const filter = searchParams?.get('display');
    if (filter === 'summary' || filter === 'detail') {
        return filter;
    } else {
        return null;
    }
};

export function OwnedTokensCard({ address }: { address: string }) {
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const ownedTokens = useAccountOwnedTokens(address);
    const fetchAccountTokens = useFetchAccountOwnedTokens();
    const refresh = () => fetchAccountTokens(pubkey);
    const [showDropdown, setDropdown] = React.useState(false);
    const display = useQueryDisplay();

    // Fetch owned tokens
    React.useEffect(() => {
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

    if (tokens.length > 100) {
        return <ErrorCard text="Token holdings is not available for accounts with over 100 token accounts" />;
    }

    return (
        <>
            {showDropdown && <div className="dropdown-exit" onClick={() => setDropdown(false)} />}

            <div className="card">
                <div className="card-header align-items-center">
                    <h3 className="card-header-title">Token Holdings</h3>
                    <DisplayDropdown display={display} toggle={() => setDropdown(show => !show)} show={showDropdown} />
                </div>
                {display === 'detail' ? (
                    <HoldingsDetailTable tokens={tokens} />
                ) : (
                    <HoldingsSummaryTable tokens={tokens} />
                )}
            </div>
        </>
    );
}

function HoldingsDetailTable({ tokens }: { tokens: TokenInfoWithPubkey[] }) {
    const detailsList: React.ReactNode[] = [];
    const showLogos = tokens.some(t => t.logoURI !== undefined);
    tokens.forEach(tokenAccount => {
        const address = tokenAccount.pubkey.toBase58();
        detailsList.push(
            <tr key={address}>
                {showLogos && (
                    <td className="w-1 p-0 text-center">
                        {tokenAccount.logoURI ? (
                            <img
                                alt="token icon"
                                className="token-icon rounded-circle border border-4 border-gray-dark"
                                height={16}
                                src={tokenAccount.logoURI}
                                width={16}
                            />
                        ) : (
                            <Identicon
                                address={address}
                                className="avatar-img identicon-wrapper identicon-wrapper-small"
                                style={{ width: SMALL_IDENTICON_WIDTH }}
                            />
                        )}
                    </td>
                )}
                <td>
                    <Address pubkey={tokenAccount.pubkey} link truncate />
                </td>
                <td>
                    <Address pubkey={tokenAccount.info.mint} link truncate tokenLabelInfo={tokenAccount} />
                </td>
                <td>
                    {tokenAccount.info.tokenAmount.uiAmountString} {tokenAccount.symbol}
                </td>
            </tr>
        );
    });

    return (
        <div className="table-responsive mb-0">
            <table className="table table-sm table-nowrap card-table">
                <thead>
                    <tr>
                        {showLogos && <th className="text-muted w-1 p-0 text-center">Logo</th>}
                        <th className="text-muted">Account Address</th>
                        <th className="text-muted">Mint Address</th>
                        <th className="text-muted">Balance</th>
                    </tr>
                </thead>
                <tbody className="list">{detailsList}</tbody>
            </table>
        </div>
    );
}

function HoldingsSummaryTable({ tokens }: { tokens: TokenInfoWithPubkey[] }) {
    type MappedToken = {
        amount: string,
        logoURI?: string,
        symbol?: string,
        name?: string
    }
    const mappedTokens = new Map<string, MappedToken>();
    for (const { info: token, logoURI, symbol, name } of tokens) {
        const mintAddress = token.mint.toBase58();
        const totalByMint = mappedTokens.get(mintAddress)?.amount;

        let amount = token.tokenAmount.uiAmountString;
        if (totalByMint !== undefined) {
            amount = new BigNumber(totalByMint).plus(token.tokenAmount.uiAmountString).toString();
        }

        mappedTokens.set(mintAddress, {
            amount,
            logoURI,
            name,
            symbol
        });
    }

    const detailsList: React.ReactNode[] = [];
    const showLogos = tokens.some(t => t.logoURI !== undefined);
    mappedTokens.forEach((token, mintAddress) => {
        detailsList.push(
            <tr key={mintAddress}>
                {showLogos && (
                    <td className="w-1 p-0 text-center">
                        {token.logoURI ? (
                            <img
                                alt="token icon"
                                className="token-icon rounded-circle border border-4 border-gray-dark"
                                height={16}
                                src={token.logoURI}
                                width={16}
                            />
                        ) : (
                            <Identicon
                                address={mintAddress}
                                className="avatar-img identicon-wrapper identicon-wrapper-small"
                                style={{ width: SMALL_IDENTICON_WIDTH }}
                            />
                        )}
                    </td>
                )}
                <td>
                    <Address pubkey={new PublicKey(mintAddress)} link tokenLabelInfo={token} useMetadata />
                </td>
                <td>
                    {token.amount} {token.symbol}
                </td>
            </tr>
        );
    });

    return (
        <div className="table-responsive mb-0">
            <table className="table table-sm table-nowrap card-table">
                <thead>
                    <tr>
                        {showLogos && <th className="text-muted w-1 p-0 text-center">Logo</th>}
                        <th className="text-muted">Mint Address</th>
                        <th className="text-muted">Total Balance</th>
                    </tr>
                </thead>
                <tbody className="list">{detailsList}</tbody>
            </table>
        </div>
    );
}

type DropdownProps = {
    display: Display;
    toggle: () => void;
    show: boolean;
};

const DisplayDropdown = ({ display, toggle, show }: DropdownProps) => {
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
        [currentPath, currentSearchParams]
    );

    const DISPLAY_OPTIONS: Display[] = [null, 'detail'];
    return (
        <div className="dropdown">
            <button className="btn btn-white btn-sm" type="button" onClick={toggle}>
                {display === 'detail' ? 'Detailed' : 'Summary'} <ChevronDown size={15} className="align-text-top" />
            </button>
            <div className={`dropdown-menu-end dropdown-menu${show ? ' show' : ''}`}>
                {DISPLAY_OPTIONS.map(displayOption => {
                    return (
                        <Link
                            key={displayOption || 'null'}
                            href={buildLocation(displayOption)}
                            className={`dropdown-item${displayOption === display ? ' active' : ''}`}
                            onClick={toggle}
                        >
                            {displayOption === 'detail' ? 'Detailed' : 'Summary'}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
