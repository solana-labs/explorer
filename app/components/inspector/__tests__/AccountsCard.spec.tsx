/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('next/navigation');

import * as stubs from '@/app/__tests__/mock-stubs';
import * as mock from '@/app/__tests__/mocks';
import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';

import { AccountsCard } from '../AccountsCard';

describe('inspector::AccountsCard', () => {
    test('should render accounts from message without lookup tables', async () => {
        const m = mock.deserializeMessage(stubs.systemTransferMsg);

        render(
            <ClusterProvider>
                <AccountsProvider>
                    <AccountsCard message={m} />
                </AccountsProvider>
            </ClusterProvider>,
        );

        // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
        await waitFor(() => {
            expect(screen.getByText(/Account List/)).toBeInTheDocument();
            // The fee payer (account index 0) carries a Signer badge — rendered from the message header,
            // independent of on-chain account loading. Both the mobile card and desktop row emit it.
            expect(screen.getAllByText('Signer').length).toBeGreaterThan(0);
        });
    });

    test('should explain the empty Change column and link to the Logs block', async () => {
        const m = mock.deserializeMessage(stubs.systemTransferMsg);

        render(
            <ClusterProvider>
                <AccountsProvider>
                    <AccountsCard message={m} />
                </AccountsProvider>
            </ClusterProvider>,
        );

        // No simulation is wired up here, so the Change column has nothing to show: the hint under the
        // heading must say why, offer a Simulate control, and point at the Logs block via an anchor.
        await waitFor(() => {
            expect(screen.getByText(/Simulate to see balance changes/, { selector: 'p' })).toBeInTheDocument();
        });
        expect(screen.getByRole('link', { name: 'Logs block' })).toHaveAttribute('href', '#logs');
        expect(screen.getAllByRole('button', { name: 'Simulate' }).length).toBeGreaterThan(0);
    });

    test('should render accounts from versioned message', async () => {
        const m = mock.deserializeMessageV0(stubs.tokenTransferMsg);

        render(
            <ClusterProvider>
                <AccountsProvider>
                    <AccountsCard message={m} />
                </AccountsProvider>
            </ClusterProvider>,
        );

        // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
        await waitFor(() => {
            expect(screen.getByText(/Account List/)).toBeInTheDocument();
            // The fee payer (account index 0) carries a Signer badge — rendered from the message header,
            // independent of on-chain account loading. Both the mobile card and desktop row emit it.
            expect(screen.getAllByText('Signer').length).toBeGreaterThan(0);
        });
    });
});
