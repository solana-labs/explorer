import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Cluster, clusterSelection, clusterUrl } from '@utils/cluster';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from '@/app/shared/lib/logger';

vi.mock('next/navigation');

const { useClusterMock, getMultipleAccounts, getRpc, fetchNftData } = vi.hoisted(() => {
    const getMultipleAccounts = vi.fn();
    return {
        fetchNftData: vi.fn(),
        getMultipleAccounts,
        getRpc: vi.fn((_url: string) => ({
            getMultipleAccounts: (...args: unknown[]) => ({ send: () => getMultipleAccounts(...args) }),
        })),
        useClusterMock: vi.fn(),
    };
});

vi.mock('../../cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('../../cluster')>();
    return { ...actual, useCluster: useClusterMock };
});

vi.mock('@entities/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/cluster')>();
    return { ...actual, getRpc };
});

vi.mock('@entities/nft', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/nft')>();
    return { ...actual, fetchNftData };
});

import { AccountsProvider, FetchersContext, type State, StateContext, useFetchAccountInfo } from '..';

type Captured = NonNullable<React.ContextType<typeof FetchersContext>>;

const TEST_PUBKEY = PublicKey.default;

const DEVNET_ENDPOINT = clusterUrl(clusterSelection(Cluster.Devnet));

// The fetchers debounce a batch by 100ms; every advance below clears that window with room to spare.
const PAST_DEBOUNCE_MS = 200;

/** Points `useCluster` at `cluster`, with `url` explicit so a test can hold one endpoint across a switch. */
function mockCluster(cluster: Cluster, url: string) {
    const selection = clusterSelection(cluster, url);
    useClusterMock.mockReturnValue({ ...selection, selection, url });
}

let captured: Captured | undefined;
function Capture() {
    const ctx = React.useContext(FetchersContext) ?? undefined;
    React.useEffect(() => {
        captured = ctx;
    }, [ctx]);
    return null;
}

describe('AccountsProvider', () => {
    beforeEach(() => {
        captured = undefined;
        mockCluster(Cluster.Devnet, DEVNET_ENDPOINT);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should cancel pending fetcher timeouts when the provider unmounts', async () => {
        const { unmount } = render(
            <AccountsProvider>
                <Capture />
            </AccountsProvider>,
        );
        await waitFor(() => expect(captured).toBeDefined());
        if (!captured) throw new Error('Fetchers context was not captured');
        const fetchers = captured;

        const parsedCancel = vi.spyOn(fetchers.parsed, 'cancel');
        const rawCancel = vi.spyOn(fetchers.raw, 'cancel');
        const skipCancel = vi.spyOn(fetchers.skip, 'cancel');

        fetchers.parsed.fetch(TEST_PUBKEY);

        unmount();

        expect(parsedCancel).toHaveBeenCalledTimes(1);
        expect(rawCancel).toHaveBeenCalledTimes(1);
        expect(skipCancel).toHaveBeenCalledTimes(1);
    });

    it('should cancel the old fetchers when the cluster changes', async () => {
        const { rerender } = render(
            <AccountsProvider>
                <Capture />
            </AccountsProvider>,
        );
        await waitFor(() => expect(captured).toBeDefined());
        if (!captured) throw new Error('Fetchers context was not captured');
        const oldFetchers = captured;

        const parsedCancel = vi.spyOn(oldFetchers.parsed, 'cancel');
        const rawCancel = vi.spyOn(oldFetchers.raw, 'cancel');
        const skipCancel = vi.spyOn(oldFetchers.skip, 'cancel');

        oldFetchers.parsed.fetch(TEST_PUBKEY);

        mockCluster(Cluster.Testnet, clusterUrl(clusterSelection(Cluster.Testnet)));
        rerender(
            <AccountsProvider>
                <Capture />
            </AccountsProvider>,
        );

        await waitFor(() => expect(captured).not.toBe(oldFetchers));

        expect(parsedCancel).toHaveBeenCalledTimes(1);
        expect(rawCancel).toHaveBeenCalledTimes(1);
        expect(skipCancel).toHaveBeenCalledTimes(1);
    });
});

describe('AccountsProvider: fetch and mount', () => {
    /**
     * Fetches from a mount effect, the shape real consumers use (the inspector's `AccountInfo`,
     * `usePmpAccountPayload`). React flushes effects bottom-up, so this runs BEFORE the provider's own effect
     * and fetches through the fetchers of the first render — the very set the provider cleanup cancels.
     */
    function FetchOnMount() {
        const fetchAccount = useFetchAccountInfo();
        React.useEffect(() => {
            fetchAccount(TEST_PUBKEY, 'skip');
        }, []); // eslint-disable-line react-hooks/exhaustive-deps -- must fetch on the first commit only
        return null;
    }

    function renderProvider(children: React.ReactNode = <FetchOnMount />) {
        return render(<AccountsProvider>{children}</AccountsProvider>);
    }

    /** Runs the debounce out so a batch either reaches the RPC or is provably gone. */
    async function flushDebounce() {
        await act(async () => {
            await vi.advanceTimersByTimeAsync(PAST_DEBOUNCE_MS);
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockCluster(Cluster.Devnet, DEVNET_ENDPOINT);
        // Every 'skip' batch lands here. Stubbing it keeps these assertions off the network and lets each test
        // read back the batch the provider actually sent.
        getMultipleAccounts.mockResolvedValue({ value: [null] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not fetch a first-commit request after the provider unmounts', async () => {
        const { unmount } = renderProvider();

        unmount();
        await flushDebounce();

        // Without the cancel this batch fired into a torn-down tree and rejected with "window is not defined".
        expect(getMultipleAccounts).not.toHaveBeenCalled();
    });

    it('should fetch a first-commit request once while the provider stays mounted', async () => {
        renderProvider();

        await flushDebounce();

        expect(getRpc).toHaveBeenCalledWith(DEVNET_ENDPOINT);
        expect(getMultipleAccounts).toHaveBeenCalledTimes(1);
        const [addresses, config] = getMultipleAccounts.mock.calls[0];
        expect(addresses).toEqual([TEST_PUBKEY.toBase58()]);
        // 'skip' mode must never download account data.
        expect(config).toEqual({ commitment: 'confirmed', dataSlice: { length: 0, offset: 0 }, encoding: 'base64' });
    });

    it('should not drop a first-commit fetch when React.StrictMode remounts the tree', async () => {
        render(
            <React.StrictMode>
                <AccountsProvider>
                    <FetchOnMount />
                </AccountsProvider>
            </React.StrictMode>,
        );

        // StrictMode mounts, tears the tree down, then mounts again, which is also what App Router dev does, so
        // the child's effect runs twice. The provider cleanup cancels the very set children fetch through, so
        // that second run has to re-arm the debounce. If it does not, a dev page sits on "Loading" forever.
        await flushDebounce();

        expect(getMultipleAccounts).toHaveBeenCalledTimes(1);
    });

    it('should keep a pending batch when the cluster changes but the url does not', async () => {
        const { rerender } = renderProvider();

        // A saved custom endpoint can point at the url a preset cluster already resolves to. Only `cluster`
        // changes here, so the fetchers must survive and the batch the child armed must still go out.
        mockCluster(Cluster.Custom, DEVNET_ENDPOINT);
        rerender(
            <AccountsProvider>
                <FetchOnMount />
            </AccountsProvider>,
        );
        await flushDebounce();

        expect(getMultipleAccounts).toHaveBeenCalledTimes(1);
    });

    it('should report a failed batch on a preset cluster', async () => {
        getMultipleAccounts.mockRejectedValue(new Error('rpc unreachable'));

        renderProvider();
        await flushDebounce();

        expect(vi.mocked(Logger.error)).toHaveBeenCalledWith(expect.any(Error), { url: DEVNET_ENDPOINT });
    });

    it('should stay quiet about a failed batch on a custom cluster', async () => {
        mockCluster(Cluster.Custom, DEVNET_ENDPOINT);
        getMultipleAccounts.mockRejectedValue(new Error('rpc unreachable'));

        renderProvider();
        await flushDebounce();

        // A custom endpoint fails for reasons we do not control, so its failures are not ours to report.
        expect(vi.mocked(Logger.error)).not.toHaveBeenCalled();
    });
});

describe('AccountsProvider: NFT metadata', () => {
    const MINT_A = new PublicKey('So11111111111111111111111111111111111111112');
    const MINT_B = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const WALLET = new PublicKey('GsbwXfJraMomNxBcpR3DBr9yoWR2PmN93PEaYJz7MSTN');

    function mintAccount() {
        return {
            data: { parsed: { info: {}, type: 'mint' }, program: 'spl-token', space: 82n },
            executable: false,
            lamports: 1_461_600n,
            owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            space: 82n,
        };
    }

    function systemAccount() {
        return {
            data: ['', 'base64'],
            executable: false,
            lamports: 1n,
            owner: '11111111111111111111111111111111',
            space: 0n,
        };
    }

    function fetchOnMount(pubkeys: PublicKey[]) {
        return function FetchOnMount() {
            const fetchAccount = useFetchAccountInfo();
            React.useEffect(() => {
                for (const pubkey of pubkeys) fetchAccount(pubkey, 'parsed');
            }, []); // eslint-disable-line react-hooks/exhaustive-deps -- must fetch on the first commit only
            return null;
        };
    }

    /** Reads `StateContext` rather than `useAccountInfo`, which also needs a real `ClusterProvider`. */
    function EntryStatus({ pubkey }: { pubkey: PublicKey }) {
        const state = React.useContext(StateContext);
        const key = pubkey.toBase58();
        return <span data-testid={key}>{state?.entries[key]?.status ?? 'absent'}</span>;
    }

    function statusOf(pubkey: PublicKey) {
        return screen.getByTestId(pubkey.toBase58()).textContent;
    }

    let entries: State['entries'] = {};
    function CaptureEntries() {
        const state = React.useContext(StateContext);
        React.useEffect(() => {
            entries = state?.entries ?? {};
        }, [state]);
        return null;
    }
    function capturedEntry(pubkey: PublicKey) {
        return entries[pubkey.toBase58()];
    }

    async function flushDebounce() {
        await act(async () => {
            await vi.advanceTimersByTimeAsync(PAST_DEBOUNCE_MS);
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockCluster(Cluster.Devnet, DEVNET_ENDPOINT);
        getMultipleAccounts.mockResolvedValue({ value: [mintAccount(), mintAccount()] });
        fetchNftData.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not read NFT metadata by default', async () => {
        const FetchMints = fetchOnMount([MINT_A, MINT_B]);
        render(
            <AccountsProvider>
                <FetchMints />
            </AccountsProvider>,
        );
        await flushDebounce();

        // Two round trips per mint plus an off-chain read, for data only the address page renders.
        expect(fetchNftData).not.toHaveBeenCalled();
    });

    it('should read NFT metadata once per mint when asked', async () => {
        const FetchMints = fetchOnMount([MINT_A, MINT_B]);
        render(
            <AccountsProvider fetchNftMetadata>
                <FetchMints />
            </AccountsProvider>,
        );
        await flushDebounce();

        expect(fetchNftData).toHaveBeenCalledTimes(2);
        expect(fetchNftData).toHaveBeenCalledWith(MINT_A, DEVNET_ENDPOINT, expect.anything());
        expect(fetchNftData).toHaveBeenCalledWith(MINT_B, DEVNET_ENDPOINT, expect.anything());
    });

    it('should start every mint in a batch without waiting for the one before it', async () => {
        fetchNftData.mockReturnValue(new Promise(() => {}));
        const FetchMints = fetchOnMount([MINT_A, MINT_B]);

        render(
            <AccountsProvider fetchNftMetadata>
                <FetchMints />
            </AccountsProvider>,
        );
        await flushDebounce();

        // Awaited inside the loop, the second mint's read only started once the first had resolved.
        expect(fetchNftData).toHaveBeenCalledTimes(2);
    });

    it('should settle a non-mint account while a mint is still reading its metadata', async () => {
        fetchNftData.mockReturnValue(new Promise(() => {}));
        getMultipleAccounts.mockResolvedValue({ value: [mintAccount(), systemAccount()] });
        const FetchBoth = fetchOnMount([MINT_A, WALLET]);

        render(
            <AccountsProvider fetchNftMetadata>
                <FetchBoth />
                <EntryStatus pubkey={MINT_A} />
                <EntryStatus pubkey={WALLET} />
            </AccountsProvider>,
        );
        await flushDebounce();

        expect(statusOf(WALLET)).toBe(String(FetchStatus.Fetched));
        expect(statusOf(MINT_A)).toBe(String(FetchStatus.Fetching));
    });

    it('should settle a mint with its metadata already attached', async () => {
        const metadata = { editionInfo: {}, json: undefined, metadata: { name: 'Test' } };
        getMultipleAccounts.mockResolvedValue({ value: [mintAccount()] });
        fetchNftData.mockResolvedValue(metadata);
        const FetchMint = fetchOnMount([MINT_A]);

        render(
            <AccountsProvider fetchNftMetadata>
                <FetchMint />
                <EntryStatus pubkey={MINT_A} />
                <CaptureEntries />
            </AccountsProvider>,
        );
        await flushDebounce();

        // One settle carrying the metadata, never a settle before it followed by a second one replaying
        // the pre-metadata snapshot over whatever landed in between.
        expect(statusOf(MINT_A)).toBe(String(FetchStatus.Fetched));
        expect(capturedEntry(MINT_A)?.data?.data.parsed).toMatchObject({ nftData: metadata });
    });
});
