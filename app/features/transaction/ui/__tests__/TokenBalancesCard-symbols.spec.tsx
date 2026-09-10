import { GENESIS_HASHES } from '@entities/chain-id/lib/const';
import { PublicKey } from '@solana/web3.js';
import { render, waitFor } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { BigNumber } from 'bignumber.js';
import { type ReactNode } from 'react';
import { SWRConfig } from 'swr';

import { TokenBalancesCardInner } from '../TokenBalancesCard';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const WSOL = 'So11111111111111111111111111111111111111112';

const mocks = vi.hoisted(() => ({
    cluster: { cluster: 0, genesisHash: undefined as string | undefined },
    getTokenInfos: vi.fn(),
}));

vi.mock('@/app/providers/cluster', () => ({ useCluster: () => mocks.cluster }));
vi.mock('@/app/utils/token-info', () => ({ getTokenInfos: mocks.getTokenInfos }));
vi.mock('@/app/providers/accounts/tokens', () => ({ useScaledUiAmountForMint: () => ['1', '1'] }));
vi.mock('@components/common/Address', () => ({ Address: () => <span>address</span> }));
vi.mock('@components/common/BalanceDelta', () => ({ BalanceDelta: () => <span>delta</span> }));
vi.mock('@components/account/token-extensions/ScaledUiAmountMultiplierTooltip', () => ({ default: () => null }));

describe('TokenBalancesCard token symbols', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.cluster = { cluster: Cluster.MainnetBeta, genesisHash: undefined };
    });

    it('should label each balance with the symbol of its own mint', async () => {
        mocks.getTokenInfos.mockResolvedValue([
            { address: USDC, symbol: 'USDC' },
            { address: WSOL, symbol: 'wSOL' },
        ]);

        const { container } = renderCard([row(USDC, '100'), row(WSOL, '2')]);

        await waitFor(() => expect(container.textContent).toContain('100 USDC'));
        expect(container.textContent).toContain('2 wSOL');
    });

    it('should ask for every mint in the card', async () => {
        mocks.getTokenInfos.mockResolvedValue([]);

        renderCard([row(USDC, '100'), row(WSOL, '2')]);

        await waitFor(() => expect(mocks.getTokenInfos).toHaveBeenCalled());
        const [mints] = mocks.getTokenInfos.mock.calls[0];
        expect(mints.map((mint: PublicKey) => mint.toBase58())).toEqual([USDC, WSOL]);
    });

    it('should fall back to "tokens" for a mint the response omits', async () => {
        mocks.getTokenInfos.mockResolvedValue([{ address: USDC, symbol: 'USDC' }]);

        const { container } = renderCard([row(USDC, '100'), row(WSOL, '2')]);

        await waitFor(() => expect(container.textContent).toContain('100 USDC'));
        expect(container.textContent).toContain('2 tokens');
    });

    // getTokenInfos reports a failed request as undefined. Caching that as "no symbols" would pin
    // the fallback under the immutable key for the rest of the session.
    it('should not cache the fallback when the request fails', async () => {
        mocks.getTokenInfos.mockResolvedValueOnce(undefined);

        const cache = new Map();
        const { container, unmount } = renderCard([row(USDC, '100')], cache);
        await waitFor(() => expect(mocks.getTokenInfos).toHaveBeenCalledTimes(1));
        expect(container.textContent).toContain('100 tokens');
        unmount();

        mocks.getTokenInfos.mockResolvedValue([{ address: USDC, symbol: 'USDC' }]);
        const { container: retried } = renderCard([row(USDC, '100')], cache);

        await waitFor(() => expect(retried.textContent).toContain('100 USDC'));
    });

    it('should read again when the cluster changes', async () => {
        mocks.getTokenInfos.mockResolvedValue([{ address: USDC, symbol: 'USDC' }]);
        const cache = new Map();

        renderCard([row(USDC, '100')], cache);
        await waitFor(() => expect(mocks.getTokenInfos).toHaveBeenCalledTimes(1));

        mocks.cluster = { cluster: Cluster.Devnet, genesisHash: undefined };
        renderCard([row(USDC, '100')], cache);

        await waitFor(() => expect(mocks.getTokenInfos).toHaveBeenCalledTimes(2));
    });

    // Without a genesisHash the Custom cluster has no chainId, so the request could only return nothing.
    it('should not ask for symbols on a Custom cluster with no genesisHash', async () => {
        mocks.cluster = { cluster: Cluster.Custom, genesisHash: undefined };

        const { container } = renderCard([row(USDC, '100')]);

        await waitFor(() => expect(container.textContent).toContain('100 tokens'));
        expect(mocks.getTokenInfos).not.toHaveBeenCalled();
    });

    it('should ask for symbols on a Custom cluster whose genesisHash names a known chain', async () => {
        mocks.cluster = { cluster: Cluster.Custom, genesisHash: GENESIS_HASHES.MAINNET };
        mocks.getTokenInfos.mockResolvedValue([{ address: USDC, symbol: 'USDC' }]);

        const { container } = renderCard([row(USDC, '100')]);

        await waitFor(() => expect(container.textContent).toContain('100 USDC'));
    });
});

function row(mint: string, balance: string) {
    return { account: new PublicKey(mint), accountIndex: 0, balance, delta: new BigNumber(0), mint };
}

function renderCard(rows: ReturnType<typeof row>[], cache = new Map()) {
    return render(<TokenBalancesCardInner rows={rows} />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            // dedupingInterval 0 so a remount in the same tick refetches instead of reusing the in-flight key.
            <SWRConfig value={{ dedupingInterval: 0, provider: () => cache }}>{children}</SWRConfig>
        ),
    });
}
