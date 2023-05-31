'use client';

import { useCluster } from '@providers/cluster';
import { Strategy, TokenInfoMap } from '@solana/spl-token-registry';
import getTokenList from '@utils/get-token-list';
import React from 'react';

const TokenRegistryContext = React.createContext<TokenInfoMap>(new Map());

type ProviderProps = { children: React.ReactNode };

export function TokenRegistryProvider({ children }: ProviderProps) {
    const [tokenRegistry, setTokenRegistry] = React.useState<TokenInfoMap>(new Map());
    const { cluster } = useCluster();

    React.useEffect(() => {
        getTokenList(cluster, Strategy.Solana).then((tokens: TokenInfoMap) => setTokenRegistry(tokens))
    }, [cluster]);

    return <TokenRegistryContext.Provider value={tokenRegistry}>{children}</TokenRegistryContext.Provider>;
}

export function useTokenRegistry() {
    const tokenRegistry = React.useContext(TokenRegistryContext);

    if (!tokenRegistry) {
        throw new Error(`useTokenRegistry must be used within a MintsProvider`);
    }

    return { tokenRegistry };
}
