import { Strategy, TokenInfo, TokenInfoMap, TokenListContainer, TokenListProvider } from '@solana/spl-token-registry';
import { Cluster, clusterSlug } from '@utils/cluster';

export default async function getTokenList(cluster: Cluster, strategy: Strategy): Promise<TokenInfoMap> {
    return new TokenListProvider().resolve(strategy).then((tokens: TokenListContainer) => {
        const tokenList = cluster === Cluster.Custom ? [] : tokens.filterByClusterSlug(clusterSlug(cluster)).getList();
        return tokenList.reduce((map: TokenInfoMap, item: TokenInfo) => {
            map.set(item.address, item);
            return map;
        }, new Map())
    });
}