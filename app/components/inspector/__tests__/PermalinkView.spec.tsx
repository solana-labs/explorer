import { FetchStatus } from '@providers/cache';
import { render, screen } from '@testing-library/react';
import { ClusterStatus } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createV1TransactionBytes } from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import { PermalinkView } from '../InspectorPage';

const fetchTransaction = vi.fn();
let cacheEntry: ReturnType<typeof makeEntry> | undefined;
let clusterStatus: ClusterStatus = ClusterStatus.Connected;

vi.mock('@providers/transactions/raw', () => ({
    useFetchRawTransaction: () => fetchTransaction,
    useRawTransactionDetails: () => cacheEntry,
}));
// PermalinkView gates its fetch on the cluster being connected; drive that status per test.
vi.mock('@/app/providers/cluster', () => ({
    useCluster: () => ({ status: clusterStatus }),
}));
// InspectorPage imports router/search-param/pathname hooks from next/navigation at module scope;
// stub them so importing PermalinkView from it doesn't blow up.
vi.mock('next/navigation', () => ({
    usePathname: () => '/tx/inspector',
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
// The v1 tests render LoadedView; stub its data-fetching children so the overview card —
// the part under test — renders without providers.
vi.mock('@providers/accounts', () => ({
    useFetchAccountInfo: () => vi.fn(),
}));
vi.mock('@features/instruction-simulation', () => ({
    SimulatorCard: () => <div data-testid="simulator-card" />,
}));
// LoadedView owns the simulation and builds a Connection eagerly; stub the hook so these overview-only
// tests don't need a live cluster URL. Idle status keeps the token-balance rows and gated tabs off.
vi.mock('@/app/features/instruction-simulation/model/use-simulation', () => ({
    useSimulation: () => ({ simulate: vi.fn(), status: 'idle' }),
}));
vi.mock('../AccountsCard', () => ({
    AccountsCard: () => <div data-testid="accounts-card" />,
}));
vi.mock('../AddressTableLookupsCard', () => ({
    AddressTableLookupsCard: () => <div data-testid="atl-card" />,
}));
vi.mock('../InstructionsSection', () => ({
    InstructionsSection: () => <div data-testid="instructions-section" />,
}));
vi.mock('../SignaturesCard', () => ({
    TransactionSignatures: () => <div data-testid="signatures-card" />,
}));
vi.mock('../AddressWithContext', () => ({
    AddressWithContext: () => <div />,
    createFeePayerValidator: () => () => undefined,
}));

// Minimal stand-in for a decoded raw tx; only the fields PermalinkView reads.
function makeEntry(raw: unknown, status = FetchStatus.Fetched) {
    return { data: { raw }, status };
}

beforeEach(() => {
    fetchTransaction.mockReset();
    cacheEntry = undefined;
    clusterStatus = ClusterStatus.Connected;
});
afterEach(() => {
    vi.restoreAllMocks();
});

const props = { reset: () => {}, showTokenBalanceChanges: false, signature: 'sig' };
const renderView = () => render(<PermalinkView {...props} />);

describe('PermalinkView', () => {
    it('should fetch at confirmed commitment on mount', () => {
        renderView();
        expect(fetchTransaction).toHaveBeenCalledWith('sig', 'confirmed');
    });

    it('should not fetch until the cluster is connected', () => {
        // Guards against fetching before the ?cluster= param settles, which would hit the default cluster.
        clusterStatus = ClusterStatus.Connecting;
        renderView();
        expect(fetchTransaction).not.toHaveBeenCalled();
    });

    it('should show "Transaction was not found" when the fetch returns no transaction', () => {
        cacheEntry = makeEntry(null); // Fetched, raw == null
        renderView();
        expect(screen.getByText('Transaction was not found')).toBeInTheDocument();
    });

    it('should show "Failed to fetch transaction" on FetchFailed', () => {
        cacheEntry = makeEntry(undefined, FetchStatus.FetchFailed);
        renderView();
        expect(screen.getByText('Failed to fetch transaction')).toBeInTheDocument();
    });

    it('should render a v1 transaction with its resource-limit rows', () => {
        const { messageBytes } = parseTransactionBytes(
            createV1TransactionBytes({ computeUnitLimit: 300_000, priorityFeeLamports: 50n }),
        );
        // No transactionConfig on the cache entry: the rows must come from decoding messageBytes,
        // the same source every other entry path uses.
        cacheEntry = makeEntry({
            messageBytes,
            signatures: [],
            version: 1,
        });

        renderView();

        expect(screen.queryByText('The inspector does not support v1 transactions')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.getByText('Compute unit limit')).toBeInTheDocument();
        expect(screen.getByText('300,000')).toBeInTheDocument();
        expect(screen.getByText('Priority fee (total)')).toBeInTheDocument();
        expect(screen.getByTestId('instructions-section')).toBeInTheDocument();
        // v1 messages carry static accounts only, so the lookups card is not rendered.
        expect(screen.queryByTestId('atl-card')).not.toBeInTheDocument();
    });

    it('should keep the error card when v1 bytes cannot be decoded', () => {
        cacheEntry = makeEntry({
            messageBytes: new Uint8Array([0x81, 1, 2, 3]),
            signatures: [],
            version: 1,
        });

        renderView();

        expect(screen.getByText('The inspector does not support v1 transactions')).toBeInTheDocument();
    });
});
