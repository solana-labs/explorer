import { gen } from '@__fixtures__/gen';
import { ChainId } from '@entities/chain-id';
import { getTokenInfosSwrKey, type TokenInfo } from '@entities/token-info';
import {
    DispatchContext as TokensDispatch,
    type State as TokensState,
    StateContext as TokensStateCtx,
} from '@providers/accounts/tokens';
import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { MockAccountsProvider } from '@storybook-config/__mocks__/MockAccountsProvider';
import { MockClusterProvider as ClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { nextjsParameters, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { expect, within } from 'storybook/test';
import { SWRConfig, unstable_serialize } from 'swr';

import { OwnedTokensCard } from '../OwnedTokensCard';

const ADDRESS = '11111111111111111111111111111111';
const noop = () => undefined;

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

const usdcTokenInfo: TokenInfo = {
    address: USDC_MINT,
    decimals: 6,
    logoURI:
        'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    name: 'USD Coin',
    symbol: 'USDC',
    verified: true,
};

// The card resolves every held mint in one lookup, so seed that lookup's cache entry rather than the
// per-mint batch provider. No entry for WSOL: an unresolved mint draws the fallback logo and, having
// no verified flag, sorts below the seeded row.
const seededTokenInfos = {
    [unstable_serialize(getTokenInfosSwrKey([USDC_MINT, WSOL_MINT], ChainId.MAINNET))]: new Map([
        [USDC_MINT, usdcTokenInfo],
    ]),
};

const tokensState = (entries: TokensState['entries']): TokensState => ({
    entries,
    url: 'https://api.mainnet-beta.solana.com',
});

const sampleTokensEntry = {
    data: {
        tokens: [
            {
                info: {
                    isNative: false,
                    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '1234560000', decimals: 6, uiAmount: 1234.56, uiAmountString: '1234.56' },
                },
                pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            },
        ],
    },
    status: FetchStatus.Fetched,
};

const sampleTokensWithLogosEntry = {
    data: {
        tokens: [
            {
                info: {
                    isNative: false,
                    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '1234560000', decimals: 6, uiAmount: 1234.56, uiAmountString: '1234.56' },
                },
                pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            },
            {
                info: {
                    isNative: false,
                    mint: new PublicKey(WSOL_MINT),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '5000000000', decimals: 9, uiAmount: 5, uiAmountString: '5' },
                },
                // No seeded logo for this mint exercises the fallback-logo branch alongside the seeded USDC row.
                pubkey: gen.publicKey(2),
            },
        ],
    },
    status: FetchStatus.Fetched,
};

function MockTokensState({ children, value }: { children: React.ReactNode; value: TokensState }) {
    return (
        <ClusterProvider>
            <MockAccountsProvider>
                <TokensStateCtx.Provider value={value}>
                    <TokensDispatch.Provider value={noop as any}>{children}</TokensDispatch.Provider>
                </TokensStateCtx.Provider>
            </MockAccountsProvider>
        </ClusterProvider>
    );
}

const withTokens: Decorator = Story => (
    <MockTokensState value={tokensState({ [ADDRESS]: sampleTokensEntry as any })}>
        <Story />
    </MockTokensState>
);

const withTokensAndLogos: Decorator = Story => (
    <MockTokensState value={tokensState({ [ADDRESS]: sampleTokensWithLogosEntry as any })}>
        <Story />
    </MockTokensState>
);

const withNoTokens: Decorator = Story => (
    <MockTokensState
        value={tokensState({
            [ADDRESS]: { data: { tokens: [] }, status: FetchStatus.Fetched },
        })}
    >
        <Story />
    </MockTokensState>
);

const meta = {
    component: OwnedTokensCard,
    decorators: [withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Account/OwnedTokensCard',
} satisfies Meta<typeof OwnedTokensCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHoldings: Story = {
    args: { address: ADDRESS },
    decorators: [withTokens],
};

export const WithLogos: Story = {
    args: { address: ADDRESS },
    decorators: [
        // Its own cache, and no revalidation: a fallback is only read when nothing is cached, and it
        // does not stop SWR refetching. There is no route to answer that fetch here, so without both
        // the seeded entry loses to an empty one.
        Story => (
            <SWRConfig value={{ fallback: seededTokenInfos, provider: () => new Map(), revalidateOnMount: false }}>
                <Story />
            </SWRConfig>
        ),
        withTokensAndLogos,
    ],
    // Symbol and logo can only come from resolved metadata, so this fails if the seeded entry stops
    // matching the key the card looks up.
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByText('1234.56 USDC')).toBeInTheDocument();
        await expect(canvasElement.querySelector('img')).toHaveAttribute('src', usdcTokenInfo.logoURI);
    },
};

export const Empty: Story = {
    args: { address: ADDRESS },
    decorators: [withNoTokens],
};
