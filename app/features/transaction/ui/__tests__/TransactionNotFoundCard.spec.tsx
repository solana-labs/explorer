import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFirstAvailableBlock } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

import { TransactionNotFoundCard } from '../TransactionNotFoundCard';

// Mock useCluster to return a controlled cluster value
vi.mock('@/app/providers/cluster', () => ({
    useCluster: vi.fn(() => ({ cluster: Cluster.MainnetBeta })),
    useFirstAvailableBlock: vi.fn(() => undefined),
}));

// Mock useClusterPath to return a simple path string
vi.mock('@/app/utils/url', () => ({
    useClusterPath: vi.fn(({ pathname }: { pathname: string }) => pathname),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock createSolanaRpc: by default all clusters return null (not found)
const mockSend = vi.fn().mockResolvedValue({ value: [null] });
vi.mock('@solana/kit', async () => {
    const actual = await vi.importActual<typeof import('@solana/kit')>('@solana/kit');
    return {
        ...actual,
        createSolanaRpc: vi.fn(() => ({
            getSignatureStatuses: vi.fn(() => ({
                send: mockSend,
            })),
        })),
    };
});

const TEST_SIGNATURE = '5UfDuX7hXbPjSUQPBfRBLRYoy4SZJvfP18VpoYz75Y4P6yCWNxbEq1RCfxGvod7U1PArBAkQbE4yLrdaAiZBmGEs';

describe('TransactionNotFoundCard', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.clearAllMocks();
        mockSend.mockResolvedValue({ value: [null] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render "Not Found" text', () => {
        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} />);
        expect(screen.getByText('Not Found')).toBeInTheDocument();
    });

    it('should render retry button when retry prop is provided', () => {
        const retry = vi.fn();
        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} retry={retry} />);
        // Two buttons exist (desktop + mobile responsive), so use getAllByText
        expect(screen.getAllByText('Try Again').length).toBeGreaterThanOrEqual(1);
    });

    it('should not render retry button when retry prop is omitted', () => {
        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} />);
        expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should call retry callback when Try Again is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const retry = vi.fn();
        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} retry={retry} />);
        const btn = screen.getAllByText('Try Again')[0];
        await user.click(btn);
        expect(retry).toHaveBeenCalledTimes(1);
    });

    it('should show the first available block note once the search comes back empty', async () => {
        mockSend.mockResolvedValue({ value: [null] });
        vi.mocked(useFirstAvailableBlock).mockReturnValue(100n);
        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} />);

        // Advance past the 700ms sleep per cluster (3 clusters × 700ms)
        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
        });

        await waitFor(() => {
            expect(
                screen.getByText('Note: Transactions processed before block 100 are not available at this time'),
            ).toBeInTheDocument();
        });
    });

    it('should not show the first available block note when the block is 0n', async () => {
        mockSend.mockResolvedValue({ value: [null] });
        vi.mocked(useFirstAvailableBlock).mockReturnValue(0n);
        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} />);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
        });

        // Search is done, but 0n does not meet the > 0n condition
        expect(screen.queryByText('Transactions processed before block', { exact: false })).not.toBeInTheDocument();
    });

    it('should show searching indicator while probing clusters', async () => {
        // Keep send pending so the hook stays in "searching" state
        mockSend.mockReturnValue(new Promise(() => {}));

        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} />);

        await waitFor(() => {
            expect(screen.getByText('Transaction does not exist')).toBeInTheDocument();
            expect(screen.getByText('checking', { exact: false })).toBeInTheDocument();
        });
    });

    it('should show "Found on" link when transaction is found on another cluster', async () => {
        // First call finds the signature (non-null result)
        mockSend.mockResolvedValueOnce({
            value: [{ confirmationStatus: 'finalized', confirmations: null, err: null, slot: 100 }],
        });

        render(<TransactionNotFoundCard signature={TEST_SIGNATURE} />);

        await waitFor(() => {
            expect(screen.getByText('Found on', { exact: false })).toBeInTheDocument();
        });
    });
});
