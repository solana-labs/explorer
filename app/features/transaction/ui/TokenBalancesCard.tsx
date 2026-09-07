'use client';

import ScaledUiAmountMultiplierTooltip from '@components/account/token-extensions/ScaledUiAmountMultiplierTooltip';
import { Address } from '@components/common/Address';
import { BalanceDelta } from '@components/common/BalanceDelta';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cn } from '@components/shared/utils';
import { useTransactionDetails } from '@providers/transactions';
import { ParsedMessageAccount, PublicKey, TokenBalance } from '@solana/web3.js';
import { SignatureProps } from '@utils/index';
import { BigNumber } from 'bignumber.js';
import { useState } from 'react';
import useAsyncEffect from 'use-async-effect';

import { useScaledUiAmountForMint } from '@/app/providers/accounts/tokens';
import { useCluster } from '@/app/providers/cluster';
import { getTokenInfos } from '@/app/utils/token-info';

import { CELL_PADDING } from './accountsTableGrid';

type TokenBalanceRow = {
    account: PublicKey;
    owner?: string;
    mint: string;
    balance: string;
    delta: BigNumber;
    accountIndex: number;
};

const GRID_TEMPLATE = 'grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,170px)_minmax(auto,180px)]';

export function TokenBalancesCard({ signature }: SignatureProps) {
    const details = useTransactionDetails(signature);

    if (!details) {
        return null;
    }

    const transactionWithMeta = details.data?.transactionWithMeta;
    const preTokenBalances = transactionWithMeta?.meta?.preTokenBalances;
    const postTokenBalances = transactionWithMeta?.meta?.postTokenBalances;
    const accountKeys = transactionWithMeta?.transaction.message.accountKeys;

    if (!preTokenBalances || !postTokenBalances || !accountKeys) {
        return null;
    }

    const rows = generateTokenBalanceRows(preTokenBalances, postTokenBalances, accountKeys);

    if (rows.length < 1) {
        return null;
    }

    return <TokenBalancesCardInner rows={rows} />;
}

export type TokenBalancesCardInnerProps = {
    rows: TokenBalanceRow[];
};

export function TokenBalancesCardInner({ rows }: TokenBalancesCardInnerProps) {
    const { cluster, genesisHash } = useCluster();
    const [tokenSymbols, setTokenSymbols] = useState<Map<string, string>>(new Map());
    const mintKey = rows.map(r => r.mint).join(',');

    // genesisHash is required to derive a chainId on Custom/Simd296 clusters - without one no mint
    // resolves and the rows render without symbols.
    useAsyncEffect(
        async isMounted => {
            const mints = rows.map(r => new PublicKey(r.mint));
            const tokens = await getTokenInfos(mints, cluster, genesisHash);
            if (!isMounted()) return;
            setTokenSymbols(new Map(tokens?.map(t => [t.address, t.symbol])));
        },
        [mintKey, cluster, genesisHash],
    );

    return (
        <CollapsibleSection id="tokens" title="Tokens">
            <div
                className={cn(
                    'hidden lg:grid',
                    CELL_PADDING,
                    'gap-5 text-xs uppercase text-outer-space-300',
                    'border-1 border-b border-white/10 [border-bottom-style:solid]',
                    GRID_TEMPLATE,
                )}
            >
                <div>#</div>
                <div>Owner / Address / Token</div>
                <div className="text-right">Change</div>
                <div className="text-right">Post Balance</div>
            </div>
            {rows.map((row, index) => (
                <TokenBalanceRow
                    index={index}
                    key={row.account.toBase58() + row.mint}
                    account={row.account}
                    owner={row.owner}
                    delta={row.delta}
                    balance={row.balance}
                    mint={row.mint}
                    units={tokenSymbols.get(row.mint) || 'tokens'}
                />
            ))}
        </CollapsibleSection>
    );
}

function TokenBalanceRow({
    account,
    owner,
    delta,
    balance,
    mint,
    units,
    index,
}: {
    account: PublicKey;
    owner?: string;
    delta: BigNumber;
    balance: string;
    mint: string;
    units: string;
    index: number;
}) {
    const [_, scaledUiAmountMultiplier] = useScaledUiAmountForMint(mint, balance);
    const scaledBalance = new BigNumber(balance).multipliedBy(scaledUiAmountMultiplier).toString();
    const scaledDelta = delta.multipliedBy(scaledUiAmountMultiplier);
    const mintPubkey = new PublicKey(mint);
    const ownerPubkey = owner ? new PublicKey(owner) : undefined;

    return (
        <div className="border-1 border-b border-white/10 [border-bottom-style:solid] last:border-b-0">
            {/* Mobile layout */}
            <div className={cn('flex flex-col gap-1 text-sm lg:hidden', CELL_PADDING)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-outer-space-300">Change</span>
                        <BalanceDelta delta={scaledDelta} />
                    </div>
                    <span className="text-outer-space-300">{index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-outer-space-300">Balance</span>
                    <span className="whitespace-nowrap">
                        {scaledBalance} {units}
                        <ScaledUiAmountMultiplierTooltip
                            rawAmount={balance}
                            scaledUiAmountMultiplier={scaledUiAmountMultiplier}
                        />
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-outer-space-300">Token</span>
                    <Address pubkey={mintPubkey} link fetchTokenLabelInfo />
                </div>
                {ownerPubkey && (
                    <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-outer-space-300">Owner</span>
                        <Address pubkey={ownerPubkey} link />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-outer-space-300">Addr</span>
                    <Address pubkey={account} link />
                </div>
            </div>

            {/* Desktop layout */}
            <div
                className={cn(
                    'hidden min-h-9 lg:grid',
                    CELL_PADDING,
                    'items-start gap-x-5 whitespace-nowrap text-sm',
                    "[grid-template-areas:'number_address_change_balance']",
                    GRID_TEMPLATE,
                )}
            >
                <div className="text-outer-space-300 [grid-area:number]">{index + 1}</div>
                <div className="flex flex-col [grid-area:address]">
                    {ownerPubkey && (
                        <div className="flex items-center gap-3">
                            <span className="min-w-11 text-sm text-outer-space-300">Owner</span>
                            <Address pubkey={ownerPubkey} link />
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="min-w-11 text-sm text-outer-space-300">Addr</span>
                        <Address pubkey={account} link />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="min-w-11 text-sm text-outer-space-300">Token</span>
                        <Address pubkey={mintPubkey} link fetchTokenLabelInfo />
                    </div>
                </div>
                <div className="justify-self-end [grid-area:change]">
                    <BalanceDelta delta={scaledDelta} />
                </div>
                <div className="justify-self-end [grid-area:balance]">
                    {scaledBalance} {units}
                    <ScaledUiAmountMultiplierTooltip
                        rawAmount={balance}
                        scaledUiAmountMultiplier={scaledUiAmountMultiplier}
                    />
                </div>
            </div>
        </div>
    );
}

export function generateTokenBalanceRows(
    preTokenBalances: TokenBalance[],
    postTokenBalances: TokenBalance[],
    accounts: ParsedMessageAccount[],
): TokenBalanceRow[] {
    const preBalanceMap: { [index: number]: TokenBalance } = {};
    const postBalanceMap: { [index: number]: TokenBalance } = {};

    preTokenBalances.forEach(balance => (preBalanceMap[balance.accountIndex] = balance));
    postTokenBalances.forEach(balance => (postBalanceMap[balance.accountIndex] = balance));

    // Check if any pre token balances do not have corresponding
    // post token balances. If not, insert a post balance of zero
    // so that the delta is displayed properly
    for (const index in preBalanceMap) {
        const preBalance = preBalanceMap[index];
        if (!postBalanceMap[index]) {
            postBalanceMap[index] = {
                accountIndex: Number(index),
                mint: preBalance.mint,
                uiTokenAmount: {
                    amount: '0',
                    decimals: preBalance.uiTokenAmount.decimals,
                    uiAmount: null,
                    uiAmountString: '0',
                },
            };
        }
    }

    const rows: TokenBalanceRow[] = [];

    for (const index in postBalanceMap) {
        const { uiTokenAmount, accountIndex, mint, owner } = postBalanceMap[index];
        const preBalance = preBalanceMap[accountIndex];
        const account = accounts[accountIndex].pubkey;

        if (!uiTokenAmount.uiAmountString) {
            // uiAmount deprecation
            continue;
        }

        const postBalanceUiAmountString = uiTokenAmount.uiAmountString;
        const preBalanceUiAmountString = preBalance?.uiTokenAmount.uiAmountString;

        // case where mint changes
        if (preBalance && preBalance.mint !== mint) {
            if (!preBalanceUiAmountString) {
                // uiAmount deprecation
                continue;
            }

            rows.push({
                account: accounts[accountIndex].pubkey,
                accountIndex,
                balance: '0',
                delta: new BigNumber(-preBalanceUiAmountString),
                mint: preBalance.mint,
                owner,
            });

            rows.push({
                account: accounts[accountIndex].pubkey,
                accountIndex,
                balance: postBalanceUiAmountString,
                delta: new BigNumber(postBalanceUiAmountString),
                mint: mint,
                owner,
            });
            continue;
        }

        let delta;

        if (preBalance) {
            if (!preBalanceUiAmountString) {
                // uiAmount deprecation
                continue;
            }

            delta = new BigNumber(postBalanceUiAmountString).minus(new BigNumber(preBalanceUiAmountString || 0));
        } else {
            delta = new BigNumber(postBalanceUiAmountString);
        }

        rows.push({
            account,
            accountIndex,
            balance: postBalanceUiAmountString,
            delta,
            mint,
            owner,
        });
    }

    return rows.sort((a, b) => a.accountIndex - b.accountIndex);
}
