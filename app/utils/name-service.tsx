'use client';

import { getFilteredProgramAccounts, NAME_PROGRAM_ID, performReverseLookup } from '@bonfida/spl-name-service';
import { useCluster } from '@providers/cluster';
import { Connection, PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { useEffect, useState } from 'react';

import { DomainInfo, SOL_TLD_AUTHORITY } from './domain-info';

async function getUserDomainAddresses(connection: Connection, userAddress: string): Promise<PublicKey[]> {
    const filters = [
        // parent
        {
            memcmp: {
                bytes: SOL_TLD_AUTHORITY.toBase58(),
                offset: 0,
            },
        },
        // owner
        {
            memcmp: {
                bytes: userAddress,
                offset: 32,
            },
        },
    ];
    const accounts = await getFilteredProgramAccounts(connection, NAME_PROGRAM_ID, filters);
    return accounts.map(a => a.publicKey);
}

export const useUserDomains = (userAddress: string): [DomainInfo[] | null, boolean] => {
    const { url, cluster } = useCluster();
    const [result, setResult] = useState<DomainInfo[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const resolve = async () => {
            // Allow only mainnet and custom
            if (![Cluster.MainnetBeta, Cluster.Custom].includes(cluster)) return;
            const connection = new Connection(url, 'confirmed');
            try {
                setLoading(true);
                const userDomainAddresses = await getUserDomainAddresses(connection, userAddress);
                const userDomains = await Promise.all(
                    userDomainAddresses.map(async address => {
                        const domainName = await performReverseLookup(connection, address);
                        return {
                            address,
                            name: `${domainName}.sol`,
                        };
                    })
                );
                userDomains.sort((a, b) => a.name.localeCompare(b.name));
                setResult(userDomains);
            } catch (err) {
                console.log(`Error fetching user domains ${err}`);
            } finally {
                setLoading(false);
            }
        };
        resolve();
    }, [userAddress, url]); // eslint-disable-line react-hooks/exhaustive-deps

    return [result, loading];
};
