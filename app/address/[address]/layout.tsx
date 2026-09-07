'use client';
import './styles.css';

import { AddressLookupTableAccountSection } from '@components/account/address-lookup-table/AddressLookupTableAccountSection';
import { isAddressLookupTableAccount } from '@components/account/address-lookup-table/types';
import { ConfigAccountSection } from '@components/account/ConfigAccountSection';
import { FeatureAccountSection } from '@components/account/FeatureAccountSection';
import { isNFTokenAccount, parseNFTokenCollectionAccount } from '@components/account/nftoken/isNFTokenAccount';
import { NFTOKEN_ADDRESS } from '@components/account/nftoken/nftoken';
import { NFTokenAccountSection } from '@components/account/nftoken/NFTokenAccountSection';
import { NonceAccountSection } from '@components/account/NonceAccountSection';
import { detectSquadsAccountType, SquadsAccountSection } from '@components/account/squads/SquadsAccountSection';
import { SysvarAccountSection } from '@components/account/SysvarAccountSection';
import { TokenAccountSection } from '@components/account/TokenAccountSection';
import { UnknownAccountCard } from '@components/account/UnknownAccountCard';
import { UpgradeableLoaderAccountSection } from '@components/account/UpgradeableLoaderAccountSection';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Header } from '@components/Header';
import { useRefreshAccount } from '@entities/account';
// Deliberately import from `lib/program-address`, NOT from `index`, which pulls the client and pako.
import { isPmpAccount } from '@entities/pmp-account/lib/program-address';
import {
    ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL,
    BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL,
    CONFIG_PROGRAM_LABEL,
    isParsedAccountProgram,
    NONCE_PROGRAM_LABEL,
    STAKE_PROGRAM_LABEL,
    SYSVAR_PROGRAM_LABEL,
    VOTE_PROGRAM_LABEL,
} from '@explorer/parsers';
import { SecurityNotification } from '@features/security-txt';
import { StakeAccountSection } from '@features/stake';
import { VoteAccountSection } from '@features/vote';
import {
    Account,
    AccountsProvider,
    isTokenProgramData,
    TokenProgramData,
    UpgradeableLoaderAccountData,
    useAccountInfo,
    useFetchAccountInfo,
} from '@providers/accounts';
import FLAGGED_ACCOUNTS_WARNING from '@providers/accounts/flagged-accounts';
import { CacheEntry, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Address } from '@solana/kit';
import { PROGRAM_ID as ACCOUNT_COMPRESSION_ID } from '@solana/spl-account-compression';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { ClusterStatus } from '@utils/cluster';
import { FEATURE_PROGRAM_ID } from '@utils/parseFeatureAccount';
import { redirect, RedirectType } from 'next/navigation';
import React, { PropsWithChildren, Suspense, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS as SAS_PROGRAM_ID } from 'sas-lib';
import useSWRImmutable from 'swr/immutable';

import { CompressedNftCard } from '@/app/components/account/CompressedNftCard';
import { SolanaAttestationServiceCard } from '@/app/components/account/sas/SolanaAttestationCard';
import { getFeatureInfo, useFeatureInfo } from '@/app/entities/feature-gate';
import { hasTokenMetadata } from '@/app/features/metadata';
import {
    isSubscriptionsAccount,
    SubscriptionsAccountCard,
    SubscriptionsEventAuthorityCard,
    useIsEventAuthority,
    useWalletDelegations,
    useWalletPlans,
} from '@/app/features/subscriptions';
import { useCompressedNft } from '@/app/providers/compressed-nft';
import { useSquadsMultisigLookup } from '@/app/providers/squadsMultisig';
import { type NavigationTab, NavigationTabLink, NavigationTabs } from '@/app/shared/ui/navigation-tabs';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { StickyHeader } from '@/app/shared/ui/sticky-header/StickyHeader';
import { isAttestationAccount } from '@/app/utils/attestation-service';
import {
    fetchFullTokenInfo,
    FullTokenInfo,
    getFullTokenInfoSwrKey,
    isRedactedTokenAddress,
} from '@/app/utils/token-info';
import { useBuildClusterPath, useClusterPath } from '@/app/utils/url';

import { AccountDataTab } from './AccountDataTab';

const TABS_LOOKUP: Record<string, AddressTab[]> = {
    'address-lookup-table': [{ path: 'entries', title: 'Table Entries' }],
    attestation: [{ path: 'attestation', title: 'Attestation Service' }],
    'bpf-upgradeable-loader': [
        { path: 'security', title: 'Security' },
        { path: 'verified-build', title: 'Verified Build' },
    ],
    'spl-account-compression': [{ path: 'concurrent-merkle-tree', title: 'Concurrent Merkle Tree' }],
    'spl-token-2022:mint': [
        { path: 'transfers', title: 'Transfers' },
        { path: 'instructions', title: 'Instructions' },
    ],
    'spl-token-2022:mint:metaplexNFT': [
        { path: 'metadata', title: 'Metadata' },
        { path: 'attributes', title: 'Attributes' },
    ],
    'spl-token:mint': [
        { path: 'transfers', title: 'Transfers' },
        { path: 'instructions', title: 'Instructions' },
    ],
    'spl-token:mint:metaplexNFT': [
        { path: 'metadata', title: 'Metadata' },
        { path: 'attributes', title: 'Attributes' },
    ],
    stake: [{ path: 'rewards', title: 'Rewards' }],
    'sysvar:recentBlockhashes': [{ path: 'blockhashes', title: 'Blockhashes' }],
    'sysvar:slotHashes': [{ path: 'slot-hashes', title: 'Slot Hashes' }],
    'sysvar:stakeHistory': [{ path: 'stake-history', title: 'Stake History' }],
    vote: [
        { path: 'vote-history', title: 'Vote History' },
        { path: 'rewards', title: 'Rewards' },
    ],
};

const TOKEN_TABS_HIDDEN = ['spl-token:mint', 'spl-token-2022:mint', 'config', 'vote', 'sysvar'];

export type AddressTabPath =
    | ''
    | 'history'
    | 'tokens'
    | 'nftoken-collection-nfts'
    | 'vote-history'
    | 'slot-hashes'
    | 'stake-history'
    | 'blockhashes'
    | 'transfers'
    | 'instructions'
    | 'rewards'
    | 'metadata'
    | 'attributes'
    | 'domains'
    | 'security'
    | 'idl'
    | 'anchor-account'
    | 'entries'
    | 'concurrent-merkle-tree'
    | 'compression'
    | 'verified-build'
    | 'program-multisig'
    | 'feature-gate'
    | 'token-extensions'
    | 'attestation'
    | 'account-data'
    | 'subscriptions';

type AddressTab = NavigationTab<AddressTabPath>;

type AddressParams = { address: string };
type Props = PropsWithChildren<{ params: Promise<AddressParams> }>;
type InnerProps = PropsWithChildren<{ params: AddressParams }>;

function AddressLayoutInner({ children, params: { address } }: InnerProps) {
    const fetchAccount = useFetchAccountInfo();
    const { status, cluster, url, genesisHash } = useCluster();
    const info = useAccountInfo(address);

    let pubkey: PublicKey | undefined;

    try {
        pubkey = new PublicKey(address);
    } catch (_err) {
        /* empty */
    }

    const infoStatus = info?.status;
    const infoParsed = info?.data?.data.parsed;

    const shouldFetchTokenInfo =
        infoStatus === FetchStatus.Fetched && infoParsed && isTokenProgramData(infoParsed) && pubkey;
    const { data: fullTokenInfo, isLoading: isFullTokenInfoLoading } = useSWRImmutable(
        shouldFetchTokenInfo ? getFullTokenInfoSwrKey(address, cluster, url, genesisHash) : null,
        fetchFullTokenInfo,
    );

    const isAccountLoading = !info || info.status === FetchStatus.Fetching;
    const isTokenInfoLoading = isAccountLoading || isFullTokenInfoLoading;

    // Fetch account on load. `info` is in the deps so the fetch re-arms if the cache entry is
    // cleared from under us (e.g. a dev-mode segment remount wiping provider state mid-fetch).
    React.useEffect(() => {
        if (!info && status === ClusterStatus.Connected && pubkey) {
            fetchAccount(pubkey, 'parsed');
        }
    }, [address, status, info]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <PageContainer variant="pulled-up">
            <Header
                address={address}
                account={info?.data}
                tokenInfo={fullTokenInfo}
                isTokenInfoLoading={isTokenInfoLoading}
            />
            {!pubkey ? (
                <ErrorCard text={`Address "${address}" is not valid`} />
            ) : (
                <DetailsSections
                    info={info}
                    pubkey={pubkey}
                    tokenInfo={fullTokenInfo}
                    isTokenInfoLoading={isTokenInfoLoading}
                    notification={<SecurityNotification parsedData={infoParsed} address={address} />}
                >
                    {children}
                </DetailsSections>
            )}
        </PageContainer>
    );
}

export default function AddressLayout(props: Props) {
    const params = use(props.params);

    const { children } = props;

    return (
        <AccountsProvider>
            <AddressLayoutInner params={params}>{children}</AddressLayoutInner>
        </AccountsProvider>
    );
}

function DetailsSections({
    children,
    pubkey,
    info,
    tokenInfo,
    isTokenInfoLoading,
    notification,
}: {
    children: React.ReactNode;
    notification: React.ReactNode;
    pubkey: PublicKey;
    info?: CacheEntry<Account>;
    tokenInfo?: FullTokenInfo;
    isTokenInfoLoading: boolean;
}) {
    const refreshAccount = useRefreshAccount();
    const address = pubkey.toBase58();

    if (!info || info.status === FetchStatus.Fetching || isTokenInfoLoading) {
        return <LoadingCard />;
    } else if (info.status === FetchStatus.FetchFailed || info.data?.lamports === undefined) {
        return <ErrorCard retry={() => refreshAccount(pubkey, 'parsed')} text="Fetch Failed" />;
    }

    const account = info.data;
    const navigationTabs = getNavigationTabs(pubkey, account);

    const hasNoAccountData = (!account.data.raw || account.data.raw.length === 0) && !account.data.parsed;
    const authority = (account.data.parsed as UpgradeableLoaderAccountData | undefined)?.programData?.authority;

    const asyncTabChildren = (
        <>
            {hasNoAccountData && (
                <Suspense fallback={null}>
                    <CompressedNftTabs pubkey={pubkey} />
                </Suspense>
            )}
            <Suspense fallback={null}>
                <ProgramMultisigTab authority={authority} />
            </Suspense>
            <Suspense fallback={null}>
                <WalletSubscriptionsTab walletAddress={account.executable ? null : address} />
            </Suspense>
            <Suspense fallback={null}>
                <AccountDataTab programId={account.owner} />
            </Suspense>
        </>
    );

    return (
        <>
            {FLAGGED_ACCOUNTS_WARNING[address] ?? null}
            <InfoSection account={account} tokenInfo={tokenInfo} />
            {notification}
            <MoreSection baseUrl={`/address/${address}`} tabs={navigationTabs} asyncChildren={asyncTabChildren}>
                {children}
            </MoreSection>
        </>
    );
}

function InfoSection({ account, tokenInfo }: { account: Account; tokenInfo?: FullTokenInfo }) {
    const parsedData = account.data.parsed;
    const rawData = account.data.raw;
    const addressPath = useClusterPath({ pathname: `/address/${account.pubkey.toBase58()}` });

    // get feature data from featureGates.json
    const featureInfo = useFeatureInfo({ address: account.pubkey.toBase58() });

    // The Subscriptions event authority is a signer-only PDA with no account data, so it
    // is recognised by its derived address rather than by decoding bytes.
    const isEventAuthority = useIsEventAuthority(account.pubkey.toBase58());

    // Squads v4 Batch / VaultTransaction accounts aren't RPC-parsed; detect them by
    // discriminator so we can surface a direct "Inspect" link to the transaction inspector.
    const squadsAccountType = rawData ? detectSquadsAccountType(account.owner, rawData) : undefined;

    // TODO: adopt @explorer/entity-inspector's accounts module (src/accounts: classifyAccountKindBase + kinds.ts; needs a browser-safe ./accounts subpath) instead of this inline kind chain
    if (isParsedAccountProgram(parsedData, BPF_UPGRADEABLE_LOADER_PROGRAM_LABEL)) {
        return (
            <UpgradeableLoaderAccountSection
                account={account}
                parsedData={parsedData.parsed}
                programData={parsedData.programData}
            />
        );
    } else if (isParsedAccountProgram(parsedData, STAKE_PROGRAM_LABEL)) {
        return (
            <StakeAccountSection
                account={account}
                stakeAccount={parsedData.parsed.info}
                activation={parsedData.activation}
                stakeAccountType={parsedData.parsed.type}
            />
        );
    } else if (account.owner.toBase58() === NFTOKEN_ADDRESS) {
        return <NFTokenAccountSection account={account} />;
    } else if (parsedData && isTokenProgramData(parsedData)) {
        return <TokenAccountSection account={account} tokenAccount={parsedData.parsed} tokenInfo={tokenInfo} />;
    } else if (isParsedAccountProgram(parsedData, NONCE_PROGRAM_LABEL)) {
        return <NonceAccountSection account={account} nonceAccount={parsedData.parsed} />;
    } else if (isParsedAccountProgram(parsedData, VOTE_PROGRAM_LABEL)) {
        return <VoteAccountSection account={account} voteAccount={parsedData.parsed} />;
    } else if (isParsedAccountProgram(parsedData, SYSVAR_PROGRAM_LABEL)) {
        return <SysvarAccountSection account={account} sysvarAccount={parsedData.parsed} />;
    } else if (isParsedAccountProgram(parsedData, CONFIG_PROGRAM_LABEL)) {
        return <ConfigAccountSection account={account} configAccount={parsedData.parsed} />;
    } else if (
        isParsedAccountProgram(parsedData, ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL) &&
        parsedData.parsed.type === 'lookupTable'
    ) {
        return <AddressLookupTableAccountSection account={account} lookupTableAccount={parsedData.parsed.info} />;
    } else if (rawData && isAddressLookupTableAccount(account.owner.toBase58() as Address, rawData)) {
        return <AddressLookupTableAccountSection account={account} data={rawData} />;
    } else if (featureInfo || account.owner.toBase58() === FEATURE_PROGRAM_ID) {
        return <FeatureAccountSection account={account} />;
    } else if (account.owner.toBase58() === SAS_PROGRAM_ID) {
        return <SolanaAttestationServiceCard account={account} />;
    } else if (isEventAuthority) {
        return <SubscriptionsEventAuthorityCard account={account} />;
    } else if (isSubscriptionsAccount(account)) {
        return (
            <SubscriptionsAccountCard
                account={account}
                onNotFound={() => redirect(addressPath, RedirectType.replace)}
            />
        );
    } else if (squadsAccountType) {
        return <SquadsAccountSection account={account} accountType={squadsAccountType} />;
    } else {
        const fallback = <UnknownAccountCard account={account} />;
        return (
            <ErrorBoundary fallback={fallback}>
                <Suspense fallback={fallback}>
                    <CompressedNftCard account={account} />
                </Suspense>
            </ErrorBoundary>
        );
    }
}

function MoreSection({
    children,
    baseUrl,
    tabs,
    asyncChildren,
}: {
    children: React.ReactNode;
    baseUrl: string;
    tabs: AddressTab[];
    asyncChildren?: React.ReactNode;
}) {
    const buildClusterPath = useBuildClusterPath();
    const buildHref = React.useCallback(
        (path: string) => buildClusterPath(`${baseUrl}/${path}`),
        [baseUrl, buildClusterPath],
    );

    return (
        <>
            <StickyHeader>
                <PageContainer>
                    <NavigationTabs buildHref={buildHref} tabs={tabs}>
                        {asyncChildren}
                    </NavigationTabs>
                </PageContainer>
            </StickyHeader>
            {children}
        </>
    );
}

function getNavigationTabs(pubkey: PublicKey, account: Account): AddressTab[] {
    const address = pubkey.toBase58();
    const parsedData = account.data.parsed;
    const tabs: AddressTab[] = [{ path: '', title: 'History' }];

    let programTypeKey = '';
    if (parsedData) {
        programTypeKey = `${parsedData.program}:${parsedData.parsed.type}`;
    }

    if (parsedData && parsedData.program in TABS_LOOKUP) {
        tabs.push(...TABS_LOOKUP[parsedData.program]);
    }

    if (parsedData && programTypeKey in TABS_LOOKUP) {
        tabs.push(...TABS_LOOKUP[programTypeKey]);
    }

    // Address lookup tables
    if (account.data.raw && isAddressLookupTableAccount(account.owner.toBase58() as Address, account.data.raw)) {
        tabs.push(...TABS_LOOKUP['address-lookup-table']);
    }

    // Metaplex NFTs
    if (
        parsedData &&
        (programTypeKey === 'spl-token:mint' || programTypeKey === 'spl-token-2022:mint') &&
        (parsedData as TokenProgramData).nftData
    ) {
        tabs.push(...TABS_LOOKUP[`${programTypeKey}:metaplexNFT`]);
    }

    // Compressed NFTs: show tabs immediately for accounts with no data.
    // TODO: duplicates with async CompressedNftTabs on desktop tablist — refactor
    // to a single source once NavigationTabLink supports static deduplication.
    if ((!account.data.raw || account.data.raw.length === 0) && !account.data.parsed) {
        tabs.push({ path: 'metadata', title: 'Metadata' });
        tabs.push({ path: 'attributes', title: 'Attributes' });
        tabs.push({ path: 'compression', title: 'Compression' });
    }

    if (hasTokenMetadata(parsedData)) {
        tabs.push({ path: 'metadata', title: 'Metadata' });
    }

    const isNFToken = account && isNFTokenAccount(account);
    if (isNFToken) {
        const collection = parseNFTokenCollectionAccount(account);
        if (collection) {
            tabs.push({ path: 'nftoken-collection-nfts', title: 'NFTs' });
        }
    }

    if (
        !isNFToken &&
        (!parsedData || !(TOKEN_TABS_HIDDEN.includes(parsedData.program) || TOKEN_TABS_HIDDEN.includes(programTypeKey)))
    ) {
        tabs.push({ path: 'tokens', title: 'Tokens' });
        tabs.push({ path: 'domains', title: 'Domains' });
    }

    if (account.owner.toBase58() === ACCOUNT_COMPRESSION_ID.toBase58()) {
        tabs.push(TABS_LOOKUP['spl-account-compression'][0]);
    }

    if (isAttestationAccount(account)) {
        tabs.push(...TABS_LOOKUP['attestation']);
    }

    // account-data tab is to display decoded data of account.
    // TODO: consider moving anchor-account tab to account-data and add support for Codama IDL accounts.
    if (isPmpAccount(account)) {
        tabs.push({ path: 'account-data', title: 'Account Data' });
    }

    if (isRedactedTokenAddress(address)) {
        const metadataIndex = tabs.findIndex(tab => tab.path === 'metadata');
        if (metadataIndex !== -1) {
            tabs.splice(metadataIndex, 1);
        }
    }

    // Sync-conditional: IDL (only for executable accounts)
    if (account.executable) {
        tabs.push({ path: 'idl', title: 'Program IDL' });
    }

    // Sync-conditional: Token Extensions (only for Token-2022 accounts)
    if (account.owner.toBase58() === TOKEN_2022_PROGRAM_ADDRESS) {
        tabs.push({ path: 'token-extensions', title: 'Extensions' });
    }

    // Sync-conditional: Feature Gate
    if (getFeatureInfo(pubkey.toBase58())) {
        tabs.push({ path: 'feature-gate', title: 'Feature Gate' });
    }

    return tabs;
}

// --- Async tab triggers (rendered inside NavigationTabs on desktop via context) ---

function CompressedNftTabs({ pubkey }: { pubkey: PublicKey }) {
    const { url } = useCluster();
    const compressedNft = useCompressedNft({ address: pubkey.toString(), url });

    if (!compressedNft || !compressedNft.compression.compressed) {
        return null;
    }

    return (
        <>
            <NavigationTabLink path="metadata" title="Metadata" />
            <NavigationTabLink path="attributes" title="Attributes" />
            <NavigationTabLink path="compression" title="Compression" />
        </>
    );
}

function ProgramMultisigTab({ authority }: { authority: PublicKey | null | undefined }) {
    const { cluster } = useCluster();
    const { data: squadMapInfo, error } = useSquadsMultisigLookup(authority, cluster);

    if (!squadMapInfo || error || !squadMapInfo.isSquad) {
        return null;
    }

    return <NavigationTabLink path="program-multisig" title="Program Multisig" />;
}

function WalletSubscriptionsTab({ walletAddress }: { walletAddress: string | null }) {
    // Non-suspense: this fires on every non-executable account page, so a failing RPC
    // (e.g. getProgramAccounts disabled/rate-limited) must hide the tab, not throw and
    // take down the whole account page. Mirrors ProgramMultisigTab's error handling.
    const { data: delegationsData, error: delegationsError } = useWalletDelegations(walletAddress, {
        suspense: false,
    });
    const { data: plansData, error: plansError } = useWalletPlans(walletAddress, { suspense: false });
    if (delegationsError || plansError) return null;
    const hasAny =
        (delegationsData?.delegations.length ?? 0) > 0 ||
        (delegationsData?.delegationsReceived.length ?? 0) > 0 ||
        (plansData?.plans.length ?? 0) > 0;
    if (!hasAny) return null;
    return <NavigationTabLink path="subscriptions" title="Subscriptions" />;
}
