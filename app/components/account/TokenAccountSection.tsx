import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { LoadingCard } from '@components/common/LoadingCard';
import { TableCardBody } from '@components/common/TableCardBody';
import { Account, NFTData, TokenProgramData, useFetchAccountInfo } from '@providers/accounts';
import { TOKEN_2022_PROGRAM_ID } from '@providers/accounts/tokens';
import isMetaplexNFT from '@providers/accounts/utils/isMetaplexNFT';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { CoingeckoStatus, useCoinGecko } from '@utils/coingecko';
import { displayTimestamp, displayTimestampWithoutDate } from '@utils/date';
import { abbreviatedNumber, normalizeTokenAmount } from '@utils/index';
import { addressLabel } from '@utils/tx';
import { MintAccountInfo, MultisigAccountInfo, TokenAccount, TokenAccountInfo } from '@validators/accounts/token';
import {
    ConfidentialTransferAccount,
    ConfidentialTransferFeeAmount,
    ConfidentialTransferFeeConfig,
    ConfidentialTransferMint,
    CpiGuard,
    DefaultAccountState,
    GroupMemberPointer,
    GroupPointer,
    InterestBearingConfig,
    MemoTransfer,
    MetadataPointer,
    MintCloseAuthority,
    PermanentDelegate,
    TokenExtension,
    TokenGroup,
    TokenGroupMember,
    TokenMetadata,
    TransferFeeAmount,
    TransferFeeConfig,
    TransferHook,
    TransferHookAccount,
} from '@validators/accounts/token-extension';
import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw } from 'react-feather';
import { create } from 'superstruct';
import useSWR from 'swr';

import { FullLegacyTokenInfo, getTokenInfo, getTokenInfoSwrKey } from '@/app/utils/token-info';

import { UnknownAccountCard } from './UnknownAccountCard';

const getEthAddress = (link?: string) => {
    let address = '';
    if (link) {
        const extractEth = link.match(/0x[a-fA-F0-9]{40,64}/);

        if (extractEth) {
            address = extractEth[0];
        }
    }

    return address;
};

export function TokenAccountSection({
    account,
    tokenAccount,
    tokenInfo,
}: {
    account: Account;
    tokenAccount: TokenAccount;
    tokenInfo?: FullLegacyTokenInfo;
}) {
    const { cluster } = useCluster();

    try {
        switch (tokenAccount.type) {
            case 'mint': {
                const mintInfo = create(tokenAccount.info, MintAccountInfo);

                if (isMetaplexNFT(account.data.parsed, mintInfo)) {
                    return (
                        <NonFungibleTokenMintAccountCard
                            account={account}
                            nftData={(account.data.parsed as TokenProgramData).nftData!}
                            mintInfo={mintInfo}
                        />
                    );
                }

                return <FungibleTokenMintAccountCard account={account} mintInfo={mintInfo} tokenInfo={tokenInfo} />;
            }
            case 'account': {
                const info = create(tokenAccount.info, TokenAccountInfo);
                return <TokenAccountCard account={account} info={info} />;
            }
            case 'multisig': {
                const info = create(tokenAccount.info, MultisigAccountInfo);
                return <MultisigAccountCard account={account} info={info} />;
            }
        }
    } catch (err) {
        if (cluster !== Cluster.Custom) {
            console.error(err, {
                address: account.pubkey.toBase58(),
            });
        }
    }
    return <UnknownAccountCard account={account} />;
}

function FungibleTokenMintAccountCard({
    account,
    mintInfo,
    tokenInfo,
}: {
    account: Account;
    mintInfo: MintAccountInfo;
    tokenInfo?: FullLegacyTokenInfo;
}) {
    const fetchInfo = useFetchAccountInfo();
    const { clusterInfo } = useCluster();
    const epoch = clusterInfo?.epochInfo.epoch;
    const refresh = () => fetchInfo(account.pubkey, 'parsed');

    const bridgeContractAddress = getEthAddress(tokenInfo?.extensions?.bridgeContract);
    const assetContractAddress = getEthAddress(tokenInfo?.extensions?.assetContract);

    const coinInfo = useCoinGecko(tokenInfo?.extensions?.coingeckoId);
    const mintExtensions = mintInfo.extensions?.slice();
    mintExtensions?.sort(cmpExtension);

    let tokenPriceInfo;
    let tokenPriceDecimals = 2;
    if (coinInfo?.status === CoingeckoStatus.Success) {
        tokenPriceInfo = coinInfo.coinInfo;
        if (tokenPriceInfo && tokenPriceInfo.price < 1) {
            tokenPriceDecimals = 6;
        }
    }

    return (
        <>
            {tokenInfo?.extensions?.coingeckoId && coinInfo?.status === CoingeckoStatus.Loading && (
                <LoadingCard message="Loading token price data" />
            )}
            {tokenPriceInfo && tokenPriceInfo.price && (
                <div className="row">
                    <div className="col-12 col-lg-4 col-xl">
                        <div className="card">
                            <div className="card-body">
                                <h4>
                                    Price{' '}
                                    {tokenPriceInfo.market_cap_rank && (
                                        <span className="ms-2 badge bg-primary rank">
                                            Rank #{tokenPriceInfo.market_cap_rank}
                                        </span>
                                    )}
                                </h4>
                                <h1 className="mb-0">
                                    ${tokenPriceInfo.price.toFixed(tokenPriceDecimals)}{' '}
                                    {tokenPriceInfo.price_change_percentage_24h > 0 && (
                                        <small className="change-positive">
                                            &uarr; {tokenPriceInfo.price_change_percentage_24h.toFixed(2)}%
                                        </small>
                                    )}
                                    {tokenPriceInfo.price_change_percentage_24h < 0 && (
                                        <small className="change-negative">
                                            &darr; {tokenPriceInfo.price_change_percentage_24h.toFixed(2)}%
                                        </small>
                                    )}
                                    {tokenPriceInfo.price_change_percentage_24h === 0 && <small>0%</small>}
                                </h1>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-lg-4 col-xl">
                        <div className="card">
                            <div className="card-body">
                                <h4>24 Hour Volume</h4>
                                <h1 className="mb-0">${abbreviatedNumber(tokenPriceInfo.volume_24)}</h1>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-lg-4 col-xl">
                        <div className="card">
                            <div className="card-body">
                                <h4>Market Cap</h4>
                                <h1 className="mb-0">${abbreviatedNumber(tokenPriceInfo.market_cap)}</h1>
                                <p className="updated-time text-muted">
                                    Updated at {displayTimestampWithoutDate(tokenPriceInfo.last_updated.getTime())}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-header-title mb-0 d-flex align-items-center">
                        {tokenInfo
                            ? 'Overview'
                            : account.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
                            ? 'Token-2022 Mint'
                            : 'Token Mint'}
                    </h3>
                    <button className="btn btn-white btn-sm" onClick={refresh}>
                        <RefreshCw className="align-text-top me-2" size={13} />
                        Refresh
                    </button>
                </div>
                <TableCardBody>
                    <tr>
                        <td>Address</td>
                        <td className="text-lg-end">
                            <Address pubkey={account.pubkey} alignRight raw />
                        </td>
                    </tr>
                    <tr>
                        <td>{mintInfo.mintAuthority === null ? 'Fixed Supply' : 'Current Supply'}</td>
                        <td className="text-lg-end">
                            {normalizeTokenAmount(mintInfo.supply, mintInfo.decimals).toLocaleString('en-US', {
                                maximumFractionDigits: 20,
                            })}
                        </td>
                    </tr>
                    {tokenInfo?.extensions?.website && (
                        <tr>
                            <td>Website</td>
                            <td className="text-lg-end">
                                <a rel="noopener noreferrer" target="_blank" href={tokenInfo.extensions.website}>
                                    {tokenInfo.extensions.website}
                                    <ExternalLink className="align-text-top ms-2" size={13} />
                                </a>
                            </td>
                        </tr>
                    )}
                    {mintInfo.mintAuthority && (
                        <tr>
                            <td>Mint Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={mintInfo.mintAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    {mintInfo.freezeAuthority && (
                        <tr>
                            <td>Freeze Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={mintInfo.freezeAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>Decimals</td>
                        <td className="text-lg-end">{mintInfo.decimals}</td>
                    </tr>
                    {!mintInfo.isInitialized && (
                        <tr>
                            <td>Status</td>
                            <td className="text-lg-end">Uninitialized</td>
                        </tr>
                    )}
                    {tokenInfo?.extensions?.bridgeContract && bridgeContractAddress && (
                        <tr>
                            <td>Bridge Contract</td>
                            <td className="text-lg-end">
                                <Copyable text={bridgeContractAddress}>
                                    <a href={tokenInfo.extensions.bridgeContract} target="_blank" rel="noreferrer">
                                        {bridgeContractAddress}
                                    </a>
                                </Copyable>
                            </td>
                        </tr>
                    )}
                    {tokenInfo?.extensions?.assetContract && assetContractAddress && (
                        <tr>
                            <td>Bridged Asset Contract</td>
                            <td className="text-lg-end">
                                <Copyable text={assetContractAddress}>
                                    <a href={tokenInfo.extensions.bridgeContract} target="_blank" rel="noreferrer">
                                        {assetContractAddress}
                                    </a>
                                </Copyable>
                            </td>
                        </tr>
                    )}
                    {mintExtensions?.map(extension =>
                        TokenExtensionRows(extension, epoch, mintInfo.decimals, tokenInfo?.symbol)
                    )}
                </TableCardBody>
            </div>
        </>
    );
}

function NonFungibleTokenMintAccountCard({
    account,
    nftData,
    mintInfo,
}: {
    account: Account;
    nftData: NFTData;
    mintInfo: MintAccountInfo;
}) {
    const fetchInfo = useFetchAccountInfo();
    const refresh = () => fetchInfo(account.pubkey, 'parsed');

    const collection = nftData.metadata.collection;
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Overview</h3>
                <button className="btn btn-white btn-sm" onClick={refresh}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>
            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                {nftData.editionInfo.masterEdition?.maxSupply && (
                    <tr>
                        <td>Max Total Supply</td>
                        <td className="text-lg-end">
                            {nftData.editionInfo.masterEdition.maxSupply.toNumber() === 0
                                ? 1
                                : nftData.editionInfo.masterEdition.maxSupply.toNumber()}
                        </td>
                    </tr>
                )}
                {nftData?.editionInfo.masterEdition?.supply && (
                    <tr>
                        <td>Current Supply</td>
                        <td className="text-lg-end">
                            {nftData.editionInfo.masterEdition.supply.toNumber() === 0
                                ? 1
                                : nftData.editionInfo.masterEdition.supply.toNumber()}
                        </td>
                    </tr>
                )}
                {!!collection?.verified && (
                    <tr>
                        <td>Verified Collection Address</td>
                        <td className="text-lg-end">
                            <Address pubkey={new PublicKey(collection.key)} alignRight link />
                        </td>
                    </tr>
                )}
                {mintInfo.mintAuthority && (
                    <tr>
                        <td>Mint Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={mintInfo.mintAuthority} alignRight link />
                        </td>
                    </tr>
                )}
                {mintInfo.freezeAuthority && (
                    <tr>
                        <td>Freeze Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={mintInfo.freezeAuthority} alignRight link />
                        </td>
                    </tr>
                )}
                <tr>
                    <td>Update Authority</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(nftData.metadata.updateAuthority)} alignRight link />
                    </td>
                </tr>
                {nftData?.json && nftData.json.external_url && (
                    <tr>
                        <td>Website</td>
                        <td className="text-lg-end">
                            <a rel="noopener noreferrer" target="_blank" href={nftData.json.external_url}>
                                {nftData.json.external_url}
                                <ExternalLink className="align-text-top ms-2" size={13} />
                            </a>
                        </td>
                    </tr>
                )}
                {nftData?.metadata.data && (
                    <tr>
                        <td>Seller Fee</td>
                        <td className="text-lg-end">{`${nftData?.metadata.data.sellerFeeBasisPoints / 100}%`}</td>
                    </tr>
                )}
            </TableCardBody>
        </div>
    );
}

async function fetchTokenInfo([_, address, cluster, url]: ['get-token-info', string, Cluster, string]) {
    return await getTokenInfo(new PublicKey(address), cluster, url);
}

function TokenAccountCard({ account, info }: { account: Account; info: TokenAccountInfo }) {
    const refresh = useFetchAccountInfo();
    const { cluster, clusterInfo, url } = useCluster();
    const epoch = clusterInfo?.epochInfo.epoch;
    const label = addressLabel(account.pubkey.toBase58(), cluster);
    const swrKey = useMemo(() => getTokenInfoSwrKey(info.mint.toString(), cluster, url), [cluster, url]);
    const { data: tokenInfo } = useSWR(swrKey, fetchTokenInfo);
    const [symbol, setSymbol] = useState<string | undefined>(undefined);
    const accountExtensions = info.extensions?.slice();
    accountExtensions?.sort(cmpExtension);

    const balance = info.isNative ? (
        <>
            {'\u25ce'}
            <span className="font-monospace">{new BigNumber(info.tokenAmount.uiAmountString).toFormat(9)}</span>
        </>
    ) : (
        <>{info.tokenAmount.uiAmountString}</>
    );

    useEffect(() => {
        if (info.isNative) {
            setSymbol('SOL');
        } else {
            setSymbol(tokenInfo?.symbol);
        }
    }, [tokenInfo]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">
                    Token{account.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58() && '-2022'} Account
                </h3>
                <button className="btn btn-white btn-sm" onClick={() => refresh(account.pubkey, 'parsed')}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                {label && (
                    <tr>
                        <td>Address Label</td>
                        <td className="text-lg-end">{label}</td>
                    </tr>
                )}
                <tr>
                    <td>Mint</td>
                    <td className="text-lg-end">
                        <Address pubkey={info.mint} alignRight link tokenLabelInfo={tokenInfo} />
                    </td>
                </tr>
                <tr>
                    <td>Owner</td>
                    <td className="text-lg-end">
                        <Address pubkey={info.owner} alignRight link />
                    </td>
                </tr>
                <tr>
                    <td>Token balance {typeof symbol === 'string' && `(${symbol})`}</td>
                    <td className="text-lg-end">{balance}</td>
                </tr>
                {info.state === 'uninitialized' && (
                    <tr>
                        <td>Status</td>
                        <td className="text-lg-end">Uninitialized</td>
                    </tr>
                )}
                {info.rentExemptReserve && (
                    <tr>
                        <td>Rent-exempt reserve (SOL)</td>
                        <td className="text-lg-end">
                            <>
                                ◎
                                <span className="font-monospace">
                                    {new BigNumber(info.rentExemptReserve.uiAmountString).toFormat(9)}
                                </span>
                            </>
                        </td>
                    </tr>
                )}
                {info.delegate && (
                    <>
                        <tr>
                            <td>Delegate</td>
                            <td className="text-lg-end">
                                <Address pubkey={info.delegate} alignRight link />
                            </td>
                        </tr>
                        <tr>
                            <td>Delegated amount {typeof symbol === 'string' && `(${symbol})`}</td>
                            <td className="text-lg-end">
                                {info.isNative ? (
                                    <>
                                        {'\u25ce'}
                                        <span className="font-monospace">
                                            {new BigNumber(
                                                info.delegatedAmount ? info.delegatedAmount.uiAmountString : '0'
                                            ).toFormat(9)}
                                        </span>
                                    </>
                                ) : (
                                    <>{info.delegatedAmount ? info.delegatedAmount.uiAmountString : '0'}</>
                                )}
                            </td>
                        </tr>
                    </>
                )}
                {accountExtensions?.map(extension =>
                    TokenExtensionRows(extension, epoch, info.tokenAmount.decimals, symbol)
                )}
            </TableCardBody>
        </div>
    );
}

function MultisigAccountCard({ account, info }: { account: Account; info: MultisigAccountInfo }) {
    const refresh = useFetchAccountInfo();

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Multisig Account</h3>
                <button className="btn btn-white btn-sm" onClick={() => refresh(account.pubkey, 'parsed')}>
                    <RefreshCw className="align-text-top ms-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Required Signers</td>
                    <td className="text-lg-end">{info.numRequiredSigners}</td>
                </tr>
                <tr>
                    <td>Valid Signers</td>
                    <td className="text-lg-end">{info.numValidSigners}</td>
                </tr>
                {info.signers.map(signer => (
                    <tr key={signer.toString()}>
                        <td>Signer</td>
                        <td className="text-lg-end">
                            <Address pubkey={signer} alignRight link />
                        </td>
                    </tr>
                ))}
                {!info.isInitialized && (
                    <tr>
                        <td>Status</td>
                        <td className="text-lg-end">Uninitialized</td>
                    </tr>
                )}
            </TableCardBody>
        </div>
    );
}

function cmpExtension(a: TokenExtension, b: TokenExtension) {
    // be sure that extensions with a header row always come later
    const sortedExtensionTypes = [
        'transferFeeAmount',
        'mintCloseAuthority',
        'defaultAccountState',
        'immutableOwner',
        'memoTransfer',
        'nonTransferable',
        'nonTransferableAccount',
        'cpiGuard',
        'permanentDelegate',
        'transferHook',
        'transferHookAccount',
        'metadataPointer',
        'groupPointer',
        'groupMemberPointer',
        // everything below this comment includes a header row
        'confidentialTransferAccount',
        'confidentialTransferFeeConfig',
        'confidentialTransferFeeAmount',
        'confidentialTransferMint',
        'interestBearingConfig',
        'transferFeeConfig',
        'tokenGroup',
        'tokenGroupMember',
        'tokenMetadata',
        // always keep this last
        'unparseableExtension',
    ];
    return sortedExtensionTypes.indexOf(a.extension) - sortedExtensionTypes.indexOf(b.extension);
}

function TokenExtensionRows(
    tokenExtension: TokenExtension,
    maybeEpoch: bigint | undefined,
    decimals: number,
    symbol: string | undefined
) {
    const epoch = maybeEpoch || 0n; // fallback to 0 if not provided
    switch (tokenExtension.extension) {
        case 'mintCloseAuthority': {
            const extension = create(tokenExtension.state, MintCloseAuthority);
            if (extension.closeAuthority) {
                return (
                    <tr>
                        <td>Close Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={extension.closeAuthority} alignRight link />
                        </td>
                    </tr>
                );
            } else {
                return <></>;
            }
        }
        case 'transferFeeAmount': {
            const extension = create(tokenExtension.state, TransferFeeAmount);
            return (
                <tr>
                    <td>Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</td>
                    <td className="text-lg-end">
                        {normalizeTokenAmount(extension.withheldAmount, decimals).toLocaleString('en-US', {
                            maximumFractionDigits: 20,
                        })}
                    </td>
                </tr>
            );
        }
        case 'transferFeeConfig': {
            const extension = create(tokenExtension.state, TransferFeeConfig);
            return (
                <>
                    <tr>
                        <h4>Transfer Fee Config</h4>
                    </tr>
                    {extension.transferFeeConfigAuthority && (
                        <tr>
                            <td>Transfer Fee Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.transferFeeConfigAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>{extension.newerTransferFee.epoch > epoch ? 'Current' : 'Previous'} Fee Epoch</td>
                        <td className="text-lg-end">{extension.olderTransferFee.epoch}</td>
                    </tr>
                    <tr>
                        <td>
                            {extension.newerTransferFee.epoch > epoch ? 'Current' : 'Previous'} Maximum Fee{' '}
                            {typeof symbol === 'string' && `(${symbol})`}
                        </td>
                        <td className="text-lg-end">
                            {normalizeTokenAmount(extension.olderTransferFee.maximumFee, decimals).toLocaleString(
                                'en-US',
                                {
                                    maximumFractionDigits: 20,
                                }
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td>{extension.newerTransferFee.epoch > epoch ? 'Current' : 'Previous'} Fee Rate</td>
                        <td className="text-lg-end">{`${extension.olderTransferFee.transferFeeBasisPoints / 100}%`}</td>
                    </tr>
                    <tr>
                        <td>{extension.newerTransferFee.epoch > epoch ? 'Future' : 'Current'} Fee Epoch</td>
                        <td className="text-lg-end">{extension.newerTransferFee.epoch}</td>
                    </tr>
                    <tr>
                        <td>
                            {extension.newerTransferFee.epoch > epoch ? 'Future' : 'Current'} Maximum Fee{' '}
                            {typeof symbol === 'string' && `(${symbol})`}
                        </td>
                        <td className="text-lg-end">
                            {normalizeTokenAmount(extension.newerTransferFee.maximumFee, decimals).toLocaleString(
                                'en-US',
                                {
                                    maximumFractionDigits: 20,
                                }
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td>{extension.newerTransferFee.epoch > epoch ? 'Future' : 'Current'} Fee Rate</td>
                        <td className="text-lg-end">{`${extension.newerTransferFee.transferFeeBasisPoints / 100}%`}</td>
                    </tr>
                    {extension.withdrawWithheldAuthority && (
                        <tr>
                            <td>Withdraw Withheld Fees Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.withdrawWithheldAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</td>
                        <td className="text-lg-end">
                            {normalizeTokenAmount(extension.withheldAmount, decimals).toLocaleString('en-US', {
                                maximumFractionDigits: 20,
                            })}
                        </td>
                    </tr>
                </>
            );
        }
        case 'confidentialTransferMint': {
            const extension = create(tokenExtension.state, ConfidentialTransferMint);
            return (
                <>
                    <tr>
                        <h4>Confidential Transfer</h4>
                    </tr>
                    {extension.authority && (
                        <tr>
                            <td>Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.authority} alignRight link />
                            </td>
                        </tr>
                    )}
                    {extension.auditorElgamalPubkey && (
                        <tr>
                            <td>Auditor Elgamal Pubkey</td>
                            <td className="text-lg-end">{extension.auditorElgamalPubkey}</td>
                        </tr>
                    )}
                    <tr>
                        <td>New Account Approval Policy</td>
                        <td className="text-lg-end">{extension.autoApproveNewAccounts ? 'auto' : 'manual'}</td>
                    </tr>
                </>
            );
        }
        case 'confidentialTransferFeeConfig': {
            const extension = create(tokenExtension.state, ConfidentialTransferFeeConfig);
            return (
                <>
                    <tr>
                        <h4>Confidential Transfer Fee</h4>
                    </tr>
                    {extension.authority && (
                        <tr>
                            <td>Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.authority} alignRight link />
                            </td>
                        </tr>
                    )}
                    {extension.withdrawWithheldAuthorityElgamalPubkey && (
                        <tr>
                            <td>Auditor Elgamal Pubkey</td>
                            <td className="text-lg-end">{extension.withdrawWithheldAuthorityElgamalPubkey}</td>
                        </tr>
                    )}
                    <tr>
                        <td>Harvest to Mint</td>
                        <td className="text-lg-end">{extension.harvestToMintEnabled ? 'enabled' : 'disabled'}</td>
                    </tr>
                    <tr>
                        <td>Encrypted Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</td>
                        <td className="text-lg-end">{extension.withheldAmount}</td>
                    </tr>
                </>
            );
        }
        case 'defaultAccountState': {
            const extension = create(tokenExtension.state, DefaultAccountState);
            return (
                <tr>
                    <td>DefaultAccountState</td>
                    <td className="text-lg-end">{extension.accountState}</td>
                </tr>
            );
        }
        case 'nonTransferable': {
            return (
                <tr>
                    <td>Non-Transferable</td>
                    <td className="text-lg-end">enabled</td>
                </tr>
            );
        }
        case 'interestBearingConfig': {
            const extension = create(tokenExtension.state, InterestBearingConfig);
            return (
                <>
                    <tr>
                        <h4>Interest-Bearing</h4>
                    </tr>
                    {extension.rateAuthority && (
                        <tr>
                            <td>Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.rateAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>Current Rate</td>
                        <td className="text-lg-end">{`${extension.currentRate / 100}%`}</td>
                    </tr>
                    <tr>
                        <td>Pre-Current Average Rate</td>
                        <td className="text-lg-end">{`${extension.preUpdateAverageRate / 100}%`}</td>
                    </tr>
                    <tr>
                        <td>Last Update Timestamp</td>
                        <td className="text-lg-end">{displayTimestamp(extension.lastUpdateTimestamp * 1000)}</td>
                    </tr>
                    <tr>
                        <td>Initialization Timestamp</td>
                        <td className="text-lg-end">{displayTimestamp(extension.initializationTimestamp * 1000)}</td>
                    </tr>
                </>
            );
        }
        case 'permanentDelegate': {
            const extension = create(tokenExtension.state, PermanentDelegate);
            if (extension.delegate) {
                return (
                    <tr>
                        <td>Permanent Delegate</td>
                        <td className="text-lg-end">
                            <Address pubkey={extension.delegate} alignRight link />
                        </td>
                    </tr>
                );
            } else {
                return <></>;
            }
        }
        case 'transferHook': {
            const extension = create(tokenExtension.state, TransferHook);
            return (
                <>
                    {extension.programId && (
                        <tr>
                            <td>Transfer Hook Program Id</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.programId} alignRight link />
                            </td>
                        </tr>
                    )}
                    {extension.authority && (
                        <tr>
                            <td>Transfer Hook Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.authority} alignRight link />
                            </td>
                        </tr>
                    )}
                </>
            );
        }
        case 'metadataPointer': {
            const extension = create(tokenExtension.state, MetadataPointer);
            return (
                <>
                    {extension.metadataAddress && (
                        <tr>
                            <td>Metadata</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.metadataAddress} alignRight link />
                            </td>
                        </tr>
                    )}
                    {extension.authority && (
                        <tr>
                            <td>Metadata Pointer Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.authority} alignRight link />
                            </td>
                        </tr>
                    )}
                </>
            );
        }
        case 'groupPointer': {
            const extension = create(tokenExtension.state, GroupPointer);
            return (
                <>
                    {extension.groupAddress && (
                        <tr>
                            <td>Token Group</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.groupAddress} alignRight link />
                            </td>
                        </tr>
                    )}
                    {extension.authority && (
                        <tr>
                            <td>Group Pointer Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.authority} alignRight link />
                            </td>
                        </tr>
                    )}
                </>
            );
        }
        case 'groupMemberPointer': {
            const extension = create(tokenExtension.state, GroupMemberPointer);
            return (
                <>
                    {extension.memberAddress && (
                        <tr>
                            <td>Token Group Member</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.memberAddress} alignRight link />
                            </td>
                        </tr>
                    )}
                    {extension.authority && (
                        <tr>
                            <td>Member Pointer Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.authority} alignRight link />
                            </td>
                        </tr>
                    )}
                </>
            );
        }
        case 'tokenMetadata': {
            const extension = create(tokenExtension.state, TokenMetadata);
            return (
                <>
                    <tr>
                        <h4>Metadata</h4>
                    </tr>
                    <tr>
                        <td>Mint</td>
                        <td className="text-lg-end">
                            <Address pubkey={extension.mint} alignRight link />
                        </td>
                    </tr>
                    {extension.updateAuthority && (
                        <tr>
                            <td>Update Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.updateAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>Name</td>
                        <td className="text-lg-end">{extension.name}</td>
                    </tr>
                    <tr>
                        <td>Symbol</td>
                        <td className="text-lg-end">{extension.symbol}</td>
                    </tr>
                    <tr>
                        <td>URI</td>
                        <td className="text-lg-end">
                            <a rel="noopener noreferrer" target="_blank" href={extension.uri}>
                                {extension.uri}
                                <ExternalLink className="align-text-top ms-2" size={13} />
                            </a>
                        </td>
                    </tr>
                    {extension.additionalMetadata?.length > 0 && (
                        <>
                            <tr>
                                <h5>Additional Metadata</h5>
                            </tr>
                            {extension.additionalMetadata?.map(keyValuePair => (
                                <tr key="{keyValuePair[0]}">
                                    <td>{keyValuePair[0]}</td>
                                    <td className="text-lg-end">{keyValuePair[1]}</td>
                                </tr>
                            ))}
                        </>
                    )}
                </>
            );
        }
        case 'cpiGuard': {
            const extension = create(tokenExtension.state, CpiGuard);
            return (
                <tr>
                    <td>CPI Guard</td>
                    <td className="text-lg-end">{extension.lockCpi ? 'enabled' : 'disabled'}</td>
                </tr>
            );
        }
        case 'confidentialTransferAccount': {
            const extension = create(tokenExtension.state, ConfidentialTransferAccount);
            return (
                <>
                    <tr>
                        <h4>Confidential Transfer</h4>
                    </tr>
                    <tr>
                        <td>Status</td>
                        <td className="text-lg-end">{!extension.approved && 'not '}approved</td>
                    </tr>
                    <tr>
                        <td>Elgamal Pubkey</td>
                        <td className="text-lg-end">{extension.elgamalPubkey}</td>
                    </tr>
                    <tr>
                        <td>Confidential Credits</td>
                        <td className="text-lg-end">{extension.allowConfidentialCredits ? 'enabled' : 'disabled'}</td>
                    </tr>
                    <tr>
                        <td>Non-confidential Credits</td>
                        <td className="text-lg-end">
                            {extension.allowNonConfidentialCredits ? 'enabled' : 'disabled'}
                        </td>
                    </tr>
                    <tr>
                        <td>Available Balance</td>
                        <td className="text-lg-end">{extension.availableBalance}</td>
                    </tr>
                    <tr>
                        <td>Decryptable Available Balance</td>
                        <td className="text-lg-end">{extension.decryptableAvailableBalance}</td>
                    </tr>
                    <tr>
                        <td>Pending Balance, Low Bits</td>
                        <td className="text-lg-end">{extension.pendingBalanceLo}</td>
                    </tr>
                    <tr>
                        <td>Pending Balance, High Bits</td>
                        <td className="text-lg-end">{extension.pendingBalanceHi}</td>
                    </tr>
                    <tr>
                        <td>Pending Balance Credit Counter</td>
                        <td className="text-lg-end">{extension.pendingBalanceCreditCounter}</td>
                    </tr>
                    <tr>
                        <td>Expected Pending Balance Credit Counter</td>
                        <td className="text-lg-end">{extension.expectedPendingBalanceCreditCounter}</td>
                    </tr>
                    <tr>
                        <td>Actual Pending Balance Credit Counter</td>
                        <td className="text-lg-end">{extension.actualPendingBalanceCreditCounter}</td>
                    </tr>
                    <tr>
                        <td>Maximum Pending Balance Credit Counter</td>
                        <td className="text-lg-end">{extension.maximumPendingBalanceCreditCounter}</td>
                    </tr>
                </>
            );
        }
        case 'immutableOwner': {
            return (
                <tr>
                    <td>Immutable Owner</td>
                    <td className="text-lg-end">enabled</td>
                </tr>
            );
        }
        case 'memoTransfer': {
            const extension = create(tokenExtension.state, MemoTransfer);
            return (
                <tr>
                    <td>Require Memo on Incoming Transfers</td>
                    <td className="text-lg-end">{extension.requireIncomingTransferMemos ? 'enabled' : 'disabled'}</td>
                </tr>
            );
        }
        case 'transferHookAccount': {
            const extension = create(tokenExtension.state, TransferHookAccount);
            return (
                <tr>
                    <td>Transfer Hook Status</td>
                    <td className="text-lg-end">{!extension.transferring && 'not '}transferring</td>
                </tr>
            );
        }
        case 'nonTransferableAccount': {
            return (
                <tr>
                    <td>Non-Transferable</td>
                    <td className="text-lg-end">enabled</td>
                </tr>
            );
        }
        case 'confidentialTransferFeeAmount': {
            const extension = create(tokenExtension.state, ConfidentialTransferFeeAmount);
            return (
                <tr>
                    <td>Encrypted Withheld Amount {typeof symbol === 'string' && `(${symbol})`}</td>
                    <td className="text-lg-end">{extension.withheldAmount}</td>
                </tr>
            );
        }
        case 'tokenGroup': {
            const extension = create(tokenExtension.state, TokenGroup);
            return (
                <>
                    <tr>
                        <h4>Group</h4>
                    </tr>
                    <tr>
                        <td>Mint</td>
                        <td className="text-lg-end">
                            <Address pubkey={extension.mint} alignRight link />
                        </td>
                    </tr>
                    {extension.updateAuthority && (
                        <tr>
                            <td>Update Authority</td>
                            <td className="text-lg-end">
                                <Address pubkey={extension.updateAuthority} alignRight link />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>Current Size</td>
                        <td className="text-lg-end">{extension.size}</td>
                    </tr>
                    <tr>
                        <td>Max Size</td>
                        <td className="text-lg-end">{extension.maxSize}</td>
                    </tr>
                </>
            );
        }
        case 'tokenGroupMember': {
            const extension = create(tokenExtension.state, TokenGroupMember);
            return (
                <>
                    <tr>
                        <h4>Group Member</h4>
                    </tr>
                    <tr>
                        <td>Mint</td>
                        <td className="text-lg-end">
                            <Address pubkey={extension.mint} alignRight link />
                        </td>
                    </tr>
                    <tr>
                        <td>Group</td>
                        <td className="text-lg-end">
                            <Address pubkey={extension.group} alignRight link />
                        </td>
                    </tr>
                    <tr>
                        <td>Member Number</td>
                        <td className="text-lg-end">{extension.memberNumber}</td>
                    </tr>
                </>
            );
        }
        case 'unparseableExtension':
        default:
            return (
                <tr>
                    <td>Unknown Extension</td>
                    <td className="text-lg-end">unparseable</td>
                </tr>
            );
    }
}
