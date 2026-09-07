import { getRpc, type SolanaRpc } from '@entities/cluster/@x/account';
import { useCluster } from '@providers/cluster';
import { address } from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';

import { fromBase64 } from '@/app/shared/lib/bytes';

export const rawAccountDataKey = (url: string, address: string) => ['raw-account-data', url, address] as const;

export function useRawAccountData(accountAddress: string) {
    const { url } = useCluster();

    return useSWR(rawAccountDataKey(url, accountAddress), () => fetchRawAccountData(getRpc(url), accountAddress), {
        revalidateOnFocus: false,
        revalidateOnMount: false,
        revalidateOnReconnect: false,
    });
}

/** Eager variant — fetches immediately on mount. Used by RawAccountRows in AccountCard. */
export function useRawAccountDataOnMount(pubkey: PublicKey): { data: Uint8Array | undefined; isLoading: boolean } {
    const { url } = useCluster();

    const { data, isLoading } = useSWRImmutable(rawAccountDataKey(url, pubkey.toBase58()), () =>
        fetchRawAccountData(getRpc(url), pubkey.toBase58()),
    );

    return { data, isLoading };
}

async function fetchRawAccountData(rpc: SolanaRpc, accountAddress: string): Promise<Uint8Array | undefined> {
    const { value } = await rpc
        .getAccountInfo(address(accountAddress), { commitment: 'confirmed', encoding: 'base64' })
        .send();
    return value ? fromBase64(value.data[0]) : undefined;
}
