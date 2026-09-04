import { CompressedNftAccountHeader } from '@components/account/CompressedNftCard';
import { MetaplexNFTHeader } from '@components/account/MetaplexNFTHeader';
import { isNFTokenAccount } from '@components/account/nftoken/isNFTokenAccount';
import { NFTokenAccountHeader } from '@components/account/nftoken/NFTokenAccountHeader';
import { useDasImage } from '@entities/digital-asset';
import { isMetaplexNFT } from '@entities/nft';
import { STAKE_PROGRAM_LABEL } from '@explorer/parsers';
import {
    Account,
    isTokenProgramData,
    isUpgradeableLoaderAccountData,
    TokenProgramData,
    useMintAccountInfo,
} from '@providers/accounts';
import { useMetadataJsonLink } from '@providers/compressed-nft';
import { MintAccountInfo } from '@validators/accounts/token';
import { MetadataPointer, TokenMetadata } from '@validators/accounts/token-extension';
import React, { Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { create } from 'superstruct';

import { dasImageAddress } from '@/app/components/account/das-image-address';
import { ProgramHeader } from '@/app/components/shared/account/ProgramHeader';
import { ProxiedImage } from '@/app/features/metadata';
import { getProxiedUri } from '@/app/features/metadata/utils';
import { type FullTokenInfo, isRedactedTokenAddress } from '@/app/utils/token-info';

export function AccountHeader({
    address,
    account,
    tokenInfo,
    isTokenInfoLoading,
}: {
    address: string;
    account?: Account;
    tokenInfo?: FullTokenInfo;
    isTokenInfoLoading: boolean;
}) {
    const mintInfo = useMintAccountInfo(address);

    const parsedData = account?.data.parsed;

    const isToken = parsedData && isTokenProgramData(parsedData) && parsedData?.parsed.type === 'mint';
    const isProgram = parsedData && isUpgradeableLoaderAccountData(parsedData) && parsedData?.parsed.type === 'program';
    const isNativeProgram = Boolean(account?.executable);

    const fallback = <AccountDetailsHeader title="Account" />;

    // Headers derived purely from on-chain account data (NFTs, programs) don't
    // depend on the async token-info (UTL) fetch, so resolve them before the
    // isTokenInfoLoading gate. Gating them on it would blank and *remount* the
    // header — re-requesting its image and flickering — on every account refetch
    // or token-info revalidation. (The accounts cache keeps stale data during a
    // refetch, so these conditions still hold and the header stays mounted.)
    // TODO: adopt @explorer/entity-inspector's accounts module (src/accounts: classifyAccountKindBase + kinds.ts; needs a browser-safe ./accounts subpath) instead of this inline kind chain
    if (isMetaplexNFT(parsedData, mintInfo) && parsedData.nftData) {
        return <MetaplexNFTHeader nftData={parsedData.nftData} />;
    }

    const nftokenNFT = account && isNFTokenAccount(account);
    if (nftokenNFT && account) {
        return <NFTokenAccountHeader account={account} />;
    }

    if (isProgram) {
        return <ProgramHeader address={address} parsedData={parsedData} />;
    }

    if (isNativeProgram) {
        return <ProgramHeader address={address} />;
    }

    // Stake accounts have a stable parsed type that doesn't depend on the token-info (UTL) fetch,
    // so resolve their header before the isTokenInfoLoading gate and render the correct title
    // ("Stake Account") instead of the generic "Account" fallback.
    if (parsedData?.program === STAKE_PROGRAM_LABEL) {
        return <AccountDetailsHeader title="Stake Account" />;
    }

    // The token-mint header consumes the token-info fetch, so wait for it.
    if (isTokenInfoLoading) return fallback;

    if (isToken) {
        if (isRedactedTokenAddress(address)) {
            return (
                <TokenMintHeader address={address} mintInfo={mintInfo} parsedData={undefined} tokenInfo={undefined} />
            );
        }
        return <TokenMintHeader address={address} mintInfo={mintInfo} parsedData={parsedData} tokenInfo={tokenInfo} />;
    }

    if (account) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Suspense fallback={fallback}>
                    <CompressedNftAccountHeader account={account} fallback={fallback} />
                </Suspense>
            </ErrorBoundary>
        );
    }
    return fallback;
}

function AccountDetailsHeader({ title }: { title: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-normal uppercase text-muted">Details</span>
            <h2 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">{title}</h2>
        </div>
    );
}

function TokenMintHeader({
    address,
    tokenInfo,
    mintInfo,
    parsedData,
}: {
    address: string;
    tokenInfo?: FullTokenInfo;
    mintInfo?: MintAccountInfo;
    parsedData?: TokenProgramData;
}): JSX.Element {
    const metadataExtension = mintInfo?.extensions?.find(
        ({ extension }: { extension: string }) => extension === 'tokenMetadata',
    );
    const metadataPointerExtension = mintInfo?.extensions?.find(
        ({ extension }: { extension: string }) => extension === 'metadataPointer',
    );
    const dasImage = useDasImage(dasImageAddress(address, tokenInfo, parsedData));

    const defaultCard = useMemo(() => {
        const logoURI = tokenInfo?.logoURI ?? dasImage;
        const token = tokenInfo ? { ...tokenInfo, logoURI } : { logoURI, name: undefined };
        return <TokenMintHeaderCard token={token} />;
    }, [dasImage, tokenInfo]);

    if (metadataPointerExtension && metadataExtension) {
        return (
            <>
                <ErrorBoundary fallback={defaultCard}>
                    <Suspense fallback={defaultCard}>
                        <Token22MintHeader
                            address={address}
                            fallbackLogoURI={dasImage}
                            metadataExtension={metadataExtension as any}
                            metadataPointerExtension={metadataPointerExtension as any}
                        />
                    </Suspense>
                </ErrorBoundary>
            </>
        );
    }
    // Fall back to legacy token list when there is stub metadata (blank uri), updatable by default by the mint authority
    else if (!parsedData?.nftData?.metadata.uri && tokenInfo) {
        return defaultCard;
    } else if (parsedData?.nftData) {
        const token = {
            logoURI: parsedData?.nftData?.json?.image ?? dasImage,
            name: parsedData?.nftData?.json?.name ?? parsedData?.nftData.metadata.name,
            symbol: parsedData?.nftData?.metadata.symbol,
        };
        return <TokenMintHeaderCard token={token} />;
    }
    return defaultCard;
}

function Token22MintHeader({
    address,
    fallbackLogoURI,
    metadataExtension,
    metadataPointerExtension,
}: {
    address: string;
    fallbackLogoURI?: string;
    metadataExtension: { extension: 'tokenMetadata'; state?: any };
    metadataPointerExtension: { extension: 'metadataPointer'; state?: any };
}) {
    const tokenMetadata = create(metadataExtension.state, TokenMetadata);
    const { metadataAddress } = create(metadataPointerExtension.state, MetadataPointer);
    const metadata = useMetadataJsonLink(getProxiedUri(tokenMetadata.uri));

    const headerTokenMetadata = {
        logoURI: metadata?.image ?? fallbackLogoURI ?? '',
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
    };

    // Handles the basic case where MetadataPointer is referencing the Token Metadata extension directly
    // Does not handle the case where MetadataPointer is pointing at a separate account.
    if (metadataAddress?.toString() === address) {
        return <TokenMintHeaderCard token={headerTokenMetadata} />;
    }
    throw new Error('Metadata loading for non-token 2022 programs is not yet supported');
}

export function TokenMintHeaderCard({
    token,
}: {
    token: { name?: string | undefined; logoURI?: string | undefined; symbol?: string | undefined };
}) {
    return (
        <div className="-mx-3 flex flex-wrap items-center">
            <div className="flex-none px-3">
                <div className="relative inline-block h-16 w-16">
                    <ProxiedImage
                        alt="Token logo"
                        className="h-full w-full rounded-full border-4 border-solid border-dk-black-dark object-cover"
                        height={64}
                        uri={token.logoURI}
                        width={64}
                    />
                </div>
            </div>

            <div className="-ml-3 min-w-0 flex-1 px-3 md:-ml-1.5">
                <h6 className="uppercase tracking-[0.08em] text-dk-gray-700">Token</h6>
                <h2 className="mb-0">{token?.name || 'Unknown Token'}</h2>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap uppercase tracking-[0.08em] text-dk-gray-700">
                    {token?.symbol ? token.symbol : 'No Symbol was found'}
                </div>
            </div>
        </div>
    );
}
