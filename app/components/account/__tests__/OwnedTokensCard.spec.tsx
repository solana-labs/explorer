import { gen } from '@__fixtures__/gen';
import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cluster } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// next/navigation is used by OwnedTokensCard's display dropdown, which selects the summary vs detail body.
const { useSearchParamsMock } = vi.hoisted(() => ({ useSearchParamsMock: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/address/x/tokens'),
    useSearchParams: useSearchParamsMock,
}));

function searchParams(display: string | null) {
    return { get: vi.fn(() => display), has: vi.fn(), toString: () => '' };
}

const { useAccountOwnedTokensMock, useFetchAccountOwnedTokensMock } = vi.hoisted(() => ({
    useAccountOwnedTokensMock: vi.fn(),
    useFetchAccountOwnedTokensMock: vi.fn(() => vi.fn()),
}));
vi.mock('@providers/accounts/tokens', () => ({
    useAccountOwnedTokens: useAccountOwnedTokensMock,
    useFetchAccountOwnedTokens: useFetchAccountOwnedTokensMock,
}));

const { useClusterMock } = vi.hoisted(() => ({ useClusterMock: vi.fn() }));
vi.mock('@providers/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@providers/cluster')>();
    return { ...actual, useCluster: useClusterMock };
});

// Only the bulk lookup is stubbed. `orderMintsByVerification` and `deriveScaledUiAmountMultiplier`
// stay real, so these specs exercise the actual tiering rather than a re-statement of it.
const { useTokenInfosMock } = vi.hoisted(() => ({ useTokenInfosMock: vi.fn() }));
vi.mock('@entities/token-info', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/token-info')>();
    return { ...actual, useTokenInfos: useTokenInfosMock };
});

// Stub Address so we can assert props without dragging in nickname/visibility/cluster-path machinery.
vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey, fetchTokenLabelInfo, tokenLabelInfo }: any) => (
        <span
            data-testid="address"
            data-fetch-label={String(Boolean(fetchTokenLabelInfo))}
            data-has-token-label-info={String(tokenLabelInfo !== undefined)}
        >
            {pubkey.toBase58()}
        </span>
    ),
}));

// Stub ProxiedImage to echo the uri (or its absence) so we can assert the logo column and fallback branch.
vi.mock('@/app/features/metadata', () => ({
    ProxiedImage: ({ uri, alt }: any) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-testid="token-logo" data-uri={uri ?? ''} alt={alt} />
    ),
}));

// Stub the tooltip to echo its props - Radix only mounts content on hover, and the values are what we assert on.
vi.mock('@components/account/token-extensions/ScaledUiAmountMultiplierTooltip', () => ({
    default: ({ rawAmount, scaledUiAmountMultiplier }: any) => (
        <span data-testid="scaled-tooltip" data-multiplier={scaledUiAmountMultiplier} data-raw-amount={rawAmount} />
    ),
}));

import { OwnedTokensCard } from '../OwnedTokensCard';

const OWNER = '11111111111111111111111111111111';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const LOGO = 'https://example.test/usdc.png';
const TOKEN_ACCOUNT_A = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_ACCOUNT_B = 'SysvarC1ock11111111111111111111111111111111';

// Distinct mints for the ordering specs, named for the tier each is set up to land in.
const VERIFIED_MINT = MINT;
const LISTED_MINT = 'So11111111111111111111111111111111111111112';
const UNKNOWN_MINT = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

type TokenAmount = { amount: string; decimals: number; uiAmountString: string };

/** One base unit at zero decimals, for specs that assert on order rather than on balances. */
const UNIT_AMOUNT: TokenAmount = { amount: '1', decimals: 0, uiAmountString: '1' };

function makeTokenAccount(tokenAmount: TokenAmount, pubkey: string = TOKEN_ACCOUNT_A, mint: string = MINT) {
    return { info: { mint: new PublicKey(mint), tokenAmount }, pubkey: new PublicKey(pubkey) };
}

// One mint held in two accounts, each scaled by 2: the row totals 8, so the tooltip must show 4 pre-scaling.
function twoAccountsOfOneMint() {
    return makeEntryWith([
        makeTokenAccount({ amount: '1000000', decimals: 6, uiAmountString: '2' }, TOKEN_ACCOUNT_A),
        makeTokenAccount({ amount: '3000000', decimals: 6, uiAmountString: '6' }, TOKEN_ACCOUNT_B),
    ]);
}

function makeEntryWith(tokens: ReturnType<typeof makeTokenAccount>[]) {
    return { data: { tokens }, status: FetchStatus.Fetched };
}

function makeEntry() {
    return makeEntryWith([makeTokenAccount({ amount: '1234560000', decimals: 6, uiAmountString: '1234.56' })]);
}

function tokenInfo(address: string, verified: boolean) {
    return { address, decimals: 6, logoURI: null, name: `Token ${address.slice(0, 4)}`, symbol: 'TKN', verified };
}

/** The resolved lookup, settled. Pass the entries the UTL list is meant to know about. */
function resolved(entries: ReturnType<typeof tokenInfo>[] = []) {
    return { isLoading: false, tokenInfos: new Map(entries.map(entry => [entry.address, entry])) };
}

/**
 * Mints in the order they are on screen. Summary display only — detail display renders an
 * account Address ahead of the mint on every row, so this would return both.
 */
function visibleMints() {
    return screen.getAllByTestId('address').map(node => node.textContent);
}

/** Undefined once every holding is on screen, since the footer renders nothing then. */
function loadMoreButton() {
    return screen.queryAllByRole('button').find(button => button.textContent?.startsWith('Load More'));
}

describe('should render OwnedTokensCard from a single bulk lookup', () => {
    beforeEach(() => {
        useClusterMock.mockReturnValue({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis', url: 'http://rpc' });
        useAccountOwnedTokensMock.mockReturnValue(makeEntry());
        useSearchParamsMock.mockReturnValue(searchParams(null));
        useTokenInfosMock.mockReturnValue(resolved());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should render the symbol and logo from the bulk lookup and label the mint Address without a second fetch', () => {
        useTokenInfosMock.mockReturnValue({
            isLoading: false,
            tokenInfos: new Map([
                [MINT, { address: MINT, decimals: 6, logoURI: LOGO, name: 'USD Coin', symbol: 'USDC', verified: true }],
            ]),
        });

        render(<OwnedTokensCard address={OWNER} />);

        // Logo column always rendered, with the resolved uri.
        const logo = screen.getByTestId('token-logo');
        expect(logo.getAttribute('data-uri')).toBe(LOGO);
        // The card resolves every held mint in one call, so rows fetch nothing themselves.
        expect(useTokenInfosMock).toHaveBeenCalledWith([MINT], Cluster.MainnetBeta, 'genesis');
        // Symbol comes from the lookup, rendered next to the amount in the balance cell.
        expect(screen.getByText('USDC', { exact: false })).toBeInTheDocument();
        // Mint Address is labeled from the already-resolved info (tokenLabelInfo), so it fetches nothing.
        const address = screen.getByTestId('address');
        expect(address.getAttribute('data-fetch-label')).toBe('false');
        expect(address.getAttribute('data-has-token-label-info')).toBe('true');
    });

    it('should still render the logo column with a fallback when token info is unavailable', () => {
        render(<OwnedTokensCard address={OWNER} />);

        // The logo cell is present and the uri is empty, so ProxiedImage shows its Solana fallback.
        const logo = screen.getByTestId('token-logo');
        expect(logo.getAttribute('data-uri')).toBe('');
        // No symbol text when info is missing.
        expect(screen.queryByText('USDC')).not.toBeInTheDocument();
    });

    it('should hold the loading state until the lookup settles, rather than paint an unsorted list', () => {
        useTokenInfosMock.mockReturnValue({ isLoading: true, tokenInfos: new Map() });

        render(<OwnedTokensCard address={OWNER} />);

        expect(screen.getByText('Loading token holdings')).toBeInTheDocument();
        expect(screen.queryAllByTestId('address')).toHaveLength(0);
    });

    it('should render the pre-scaling raw amount without u64 precision loss', () => {
        // 2^53 + 1 base units: Number() rounds this to ...992, dropping the trailing 3 from the displayed amount.
        useAccountOwnedTokensMock.mockReturnValue(
            makeEntryWith([
                makeTokenAccount({ amount: '9007199254740993', decimals: 6, uiAmountString: '18014398509.481986' }),
            ]),
        );

        render(<OwnedTokensCard address={OWNER} />);

        const tooltip = screen.getByTestId('scaled-tooltip');
        expect(tooltip.getAttribute('data-multiplier')).toBe('2');
        expect(tooltip.getAttribute('data-raw-amount')).toBe('9007199254.740993');
    });

    it('should sum rawAmount across token accounts of the same mint in summary display', () => {
        useAccountOwnedTokensMock.mockReturnValue(twoAccountsOfOneMint());

        render(<OwnedTokensCard address={OWNER} />);

        expect(screen.getByText('8')).toBeInTheDocument();
        const tooltip = screen.getByTestId('scaled-tooltip');
        expect(tooltip.getAttribute('data-multiplier')).toBe('2');
        expect(tooltip.getAttribute('data-raw-amount')).toBe('4');
    });

    it('should sum rawAmount across token accounts of the same mint in detail display', () => {
        useSearchParamsMock.mockReturnValue(searchParams('detail'));
        useAccountOwnedTokensMock.mockReturnValue(twoAccountsOfOneMint());

        render(<OwnedTokensCard address={OWNER} />);

        expect(screen.getByText('8')).toBeInTheDocument();
        const tooltip = screen.getByTestId('scaled-tooltip');
        expect(tooltip.getAttribute('data-multiplier')).toBe('2');
        expect(tooltip.getAttribute('data-raw-amount')).toBe('4');
    });
});

describe('should order holdings by verification tier', () => {
    function heldInWorstOrder() {
        return makeEntryWith([
            makeTokenAccount(UNIT_AMOUNT, TOKEN_ACCOUNT_A, UNKNOWN_MINT),
            makeTokenAccount(UNIT_AMOUNT, TOKEN_ACCOUNT_A, LISTED_MINT),
            makeTokenAccount(UNIT_AMOUNT, TOKEN_ACCOUNT_A, VERIFIED_MINT),
        ]);
    }

    beforeEach(() => {
        useClusterMock.mockReturnValue({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis', url: 'http://rpc' });
        useSearchParamsMock.mockReturnValue(searchParams(null));
        useAccountOwnedTokensMock.mockReturnValue(heldInWorstOrder());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // The holdings are set up in the exact reverse of this order, so a pass cannot come from RPC order.
    it('should render verified mints first, then listed, then those the list does not know', () => {
        useTokenInfosMock.mockReturnValue(resolved([tokenInfo(VERIFIED_MINT, true), tokenInfo(LISTED_MINT, false)]));

        render(<OwnedTokensCard address={OWNER} />);

        expect(visibleMints()).toEqual([VERIFIED_MINT, LISTED_MINT, UNKNOWN_MINT]);
    });

    it('should fall back to RPC order when the lookup resolved nothing', () => {
        useTokenInfosMock.mockReturnValue(resolved());

        render(<OwnedTokensCard address={OWNER} />);

        expect(visibleMints()).toEqual([UNKNOWN_MINT, LISTED_MINT, VERIFIED_MINT]);
    });

    // The spec pins this: reordering may promote a tier, never shuffle inside one.
    it('should keep RPC order within a tier', () => {
        const [first, second, third, fourth] = [gen.address(1), gen.address(2), gen.address(3), gen.address(4)];
        useAccountOwnedTokensMock.mockReturnValue(
            makeEntryWith(
                [first, second, third, fourth].map(mint => makeTokenAccount(UNIT_AMOUNT, TOKEN_ACCOUNT_A, mint)),
            ),
        );
        useTokenInfosMock.mockReturnValue(resolved([tokenInfo(first, true), tokenInfo(third, true)]));

        render(<OwnedTokensCard address={OWNER} />);

        // Verified pair keeps its relative order, then the unresolved pair keeps its own.
        expect(visibleMints()).toEqual([first, third, second, fourth]);
    });
});

describe('should page the ordered holdings', () => {
    // 25 mints so the 20-row first page leaves a remainder, with the verified ones last in RPC order.
    const allMints = Array.from({ length: 25 }, (_, index) => gen.address(index + 10));
    const verifiedMints = allMints.slice(-5);

    beforeEach(() => {
        useClusterMock.mockReturnValue({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis', url: 'http://rpc' });
        useSearchParamsMock.mockReturnValue(searchParams(null));
        useAccountOwnedTokensMock.mockReturnValue(
            makeEntryWith(allMints.map(mint => makeTokenAccount(UNIT_AMOUNT, TOKEN_ACCOUNT_A, mint))),
        );
        useTokenInfosMock.mockReturnValue(resolved(verifiedMints.map(mint => tokenInfo(mint, true))));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should fill the first page from the top of the ordered list, not from RPC order', () => {
        render(<OwnedTokensCard address={OWNER} />);

        const firstPage = visibleMints();
        expect(firstPage).toHaveLength(20);
        // Last five by RPC order, first five once ordered.
        expect(firstPage.slice(0, 5)).toEqual(verifiedMints);
    });

    it('should count unique mints in the footer, not token accounts', () => {
        render(<OwnedTokensCard address={OWNER} />);

        expect(loadMoreButton()).toHaveTextContent('Load More (20 of 25)');
    });

    it('should append the next page without moving the rows already on screen', async () => {
        render(<OwnedTokensCard address={OWNER} />);
        const firstPage = visibleMints();

        await userEvent.click(screen.getByRole('button', { name: 'Load More (20 of 25)' }));

        expect(visibleMints()).toHaveLength(25);
        expect(visibleMints().slice(0, 20)).toEqual(firstPage);
        expect(loadMoreButton()).toBeUndefined();
    });
});

describe('should render the account address column only in detail display', () => {
    beforeEach(() => {
        useClusterMock.mockReturnValue({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis', url: 'http://rpc' });
        useTokenInfosMock.mockReturnValue(resolved());
        useAccountOwnedTokensMock.mockReturnValue(makeEntry());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should render the account address ahead of the mint in detail display', () => {
        useSearchParamsMock.mockReturnValue(searchParams('detail'));

        render(<OwnedTokensCard address={OWNER} />);

        expect(screen.getByText('Account Address')).toBeInTheDocument();
        expect(screen.getAllByTestId('address').map(node => node.textContent)).toEqual([TOKEN_ACCOUNT_A, MINT]);
    });

    it('should omit the account address in summary display', () => {
        useSearchParamsMock.mockReturnValue(searchParams(null));

        render(<OwnedTokensCard address={OWNER} />);

        expect(screen.queryByText('Account Address')).not.toBeInTheDocument();
        expect(visibleMints()).toEqual([MINT]);
    });

    // One row per mint, so a mint held twice shows a summed balance against a single account.
    it('should show the last account of a mint held in several', () => {
        useSearchParamsMock.mockReturnValue(searchParams('detail'));
        useAccountOwnedTokensMock.mockReturnValue(twoAccountsOfOneMint());

        render(<OwnedTokensCard address={OWNER} />);

        expect(screen.getAllByTestId('address').map(node => node.textContent)).toEqual([TOKEN_ACCOUNT_B, MINT]);
    });
});
