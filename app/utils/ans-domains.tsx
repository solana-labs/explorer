import { NameRecordHeader,TldParser } from '@onsol/tldparser';
import { Connection } from '@solana/web3.js';
import pLimit from 'p-limit';
import { useEffect,useState } from 'react';

import { useCluster } from '../providers/cluster';
import { Cluster } from './cluster';
import { DomainInfo } from './domain-info';


export const useUserANSDomains = (userAddress: string): [DomainInfo[] | null, boolean] => {
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

                const parser = new TldParser(connection);
                const allDomains = await parser.getAllUserDomains(userAddress);

                if (!allDomains) {
                    return;
                }
                const userDomains: DomainInfo[] = [];
                const limit = pLimit(5);
                const promises = allDomains.map(address =>
                    limit(async () => {
                        const domainRecord = await NameRecordHeader.fromAccountAddress(connection, address);

                        // expired or not found
                        if (!domainRecord?.owner) return;

                        const domainParentNameAccount = await NameRecordHeader.fromAccountAddress(
                            connection,
                            domainRecord?.parentName
                        );

                        // not found
                        if (!domainParentNameAccount?.owner) return;

                        const tld = await parser.getTldFromParentAccount(domainRecord?.parentName);

                        const domain = await parser.reverseLookupNameAccount(
                            address,
                            domainParentNameAccount?.owner
                        );

                        // domain not found or might be a subdomain.
                        if (!domain) return;

                        userDomains.push({
                            address,
                            name: `${domain}${tld}`,
                        });
                    })
                );

                await Promise.all(promises);
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
