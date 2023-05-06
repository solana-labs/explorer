import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Account, useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import { RedirectType } from 'next/dist/client/components/redirect';
import { redirect } from 'next/navigation';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useClusterPath } from '@/app/utils/url';

type ParsedAccountRendererProps = Readonly<{
    account: Account | undefined;
    onNotFound(): never;
}>;

export function ParsedAccountRenderer({
    address,
    renderComponent: RenderComponent,
}: {
    address: string;
    renderComponent: React.ComponentType<ParsedAccountRendererProps>;
}) {
    const fetchAccount = useFetchAccountInfo();
    const { status } = useCluster();
    const accountInfoCacheEntry = useAccountInfo(address);
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const rootAddressPathname = useClusterPath({ pathname: `/address/${address}` });
    const onNotFound = useCallback(() => {
        redirect(rootAddressPathname, RedirectType.replace);
    }, [rootAddressPathname]);
    useEffect(() => {
        if (!accountInfoCacheEntry && status === ClusterStatus.Connected && address) {
            // Fetch account on load
            fetchAccount(pubkey, 'parsed');
        }
    }, [accountInfoCacheEntry, address, fetchAccount, pubkey, status]);
    if (!accountInfoCacheEntry || accountInfoCacheEntry.status === FetchStatus.Fetching) {
        return <LoadingCard />;
    } else if (
        accountInfoCacheEntry.status === FetchStatus.FetchFailed ||
        accountInfoCacheEntry.data?.lamports === undefined
    ) {
        return <ErrorCard retry={() => fetchAccount(pubkey, 'parsed')} text="Fetch Failed" />;
    } else {
        return <RenderComponent account={accountInfoCacheEntry.data} onNotFound={onNotFound} />;
    }
}
