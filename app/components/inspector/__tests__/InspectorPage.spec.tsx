/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import type { AccountInfo } from '@solana/web3.js';
import { generated, PROGRAM_ID } from '@sqds/multisig';
import { render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import type { Key } from 'swr';
import { describe, expect, type Mock, test, vi } from 'vitest';

import { InstructionParserProvider } from '@/app/entities/instruction-parser';
import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';

import { TransactionInspectorPage, vaultMessageToVersionedMessage } from '../InspectorPage';

vi.mock('swr', () => ({
    __esModule: true,
    default: vi.fn(() => ({ data: undefined })),
}));

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
}));

describe('TransactionInspectorPage with Squads Transaction', () => {
    beforeEach(async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });

        const params = new URLSearchParams();
        params.set('squadsTx', 'ASwDJP5mzxV1dfov2eQz5WAVEy833nwK17VLcjsrZsZf');

        vi.spyOn(await import('next/navigation'), 'useSearchParams').mockReturnValue(
            params as unknown as ReturnType<typeof useSearchParams>,
        );
        vi.spyOn(await import('next/navigation'), 'useRouter').mockReturnValue({
            push: vi.fn(),
            replace: vi.fn(),
        } as unknown as ReturnType<typeof useRouter>);

        // Mock fetch for the /api/idl-latest route (catch-all empty payload — no IDL needed here)
        global.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({}), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200,
                }),
            ),
        );
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    test('should render without crashing and load Squads account data', async () => {
        const { renderWithContext, specificAccountKey, squadsAccountInfo } = setup();
        const mockSWR = await import('swr');
        (mockSWR.default as unknown as Mock).mockImplementation((key: Key) => {
            if (Array.isArray(key) && key[0] === specificAccountKey[0] && key[1] === specificAccountKey[1]) {
                return {
                    data: [
                        vaultMessageToVersionedMessage(
                            generated.VaultTransaction.fromAccountInfo(squadsAccountInfo)[0].message,
                        ),
                    ],
                    error: null,
                    isLoading: false,
                };
            }
            return { data: null, error: null, isLoading: true };
        });

        renderWithContext();

        // The Overview card's Fee payer row shows the fee payer address (the address also appears in the
        // Account List, so match all occurrences).
        expect((await screen.findAllByText('F3S4PD17Eo3FyCMropzDLCpBFuQuBmufUVBBdKEHbQFT')).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Inspector Input/i)).toBeNull();

        expect(screen.getByText(/Account List/i)).not.toBeNull();
        // The card title splits programName and "Instruction" into separate spans so the
        // programName can truncate independently on mobile; multiple matches are expected.
        expect(screen.getAllByText(/BPF Upgradeable Loader/i).length).toBeGreaterThan(0);
    });

    test('should render when account loading fails', async () => {
        const { renderWithContext, specificAccountKey } = setup();
        const mockSWR = await import('swr');

        (mockSWR.default as unknown as Mock).mockImplementation((key: Key) => {
            if (Array.isArray(key) && key[0] === specificAccountKey[0] && key[1] === specificAccountKey[1]) {
                return {
                    data: null,
                    error: new Error('Failed to load account'),
                    isLoading: false,
                };
            }
            return { data: null, error: null, isLoading: true };
        });

        renderWithContext();

        expect(await screen.findByText(/Error loading Squads transaction/i)).toBeInTheDocument();
    });

    test('should render Squads transaction with lookup table without crashing', async () => {
        const { renderWithContext, specificAccountKey, squadsLookupTableAccountInfo } = setup();
        const mockSWR = await import('swr');

        (mockSWR.default as unknown as Mock).mockImplementation((key: Key) => {
            if (Array.isArray(key) && key[0] === specificAccountKey[0] && key[1] === specificAccountKey[1]) {
                return {
                    data: [
                        vaultMessageToVersionedMessage(
                            generated.VaultTransaction.fromAccountInfo(squadsLookupTableAccountInfo)[0].message,
                        ),
                    ],
                    error: null,
                    isLoading: false,
                };
            }
            return { data: null, error: null, isLoading: true };
        });

        renderWithContext();

        // The Overview card's Fee payer row shows the fee payer address (also present in the Account List).
        expect((await screen.findAllByText('62gRsAdA6dcbf4Frjp7YRFLpFgdGu8emAACcnnREX3L3')).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Inspector Input/i)).toBeNull();

        // Note: Instructions section may show LoadingCard if lookup tables aren't fully resolved,
        // but the main transaction data is correctly displayed
        expect(screen.getByText(/Account List/i)).not.toBeNull();
    });
});

function setup() {
    const renderWithContext = () => {
        render(
            <ScrollAnchorProvider>
                <ClusterProvider>
                    <AccountsProvider>
                        <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                            <TransactionInspectorPage showTokenBalanceChanges={false} />
                        </InstructionParserProvider>
                    </AccountsProvider>
                </ClusterProvider>
            </ScrollAnchorProvider>,
        );
    };
    const specificAccountKey = [
        'squads-proposal',
        'ASwDJP5mzxV1dfov2eQz5WAVEy833nwK17VLcjsrZsZf',
        'https://api.mainnet-beta.solana.com',
    ];

    // From Squads transaction ASwDJP5mzxV1dfov2eQz5WAVEy833nwK17VLcjsrZsZf
    const squadsAccountInfo: AccountInfo<Buffer> = {
        data: Buffer.from(
            'qPqiZFEOos+fErS/xkrbJRCvXG3UbwrUsJlVxCt0e4xgzjQyewfzMULyaPFkYPsCiNMe9FN//udpL5PwKAM/1qdskrvY+9nLCAAAAAAAAAD/AP8AAAAAAQEECAAAANCjHLRKvgiq2AoZK5QSGOfYj5bTGybeyAspA1+XDrVyM90v0fImaE0NQYcSinPuk++6GJEe5cKJZ4w9p0mAYgkJKhPulcQcugimf1rGfo334doRYl4dZBN/j08jgwN/FDCuVi3sTsjyvqU+oP8oI/e92Q78flUtkwuKGo3ug/s7V4efG9ifzqH+b9ldMvB714n0oZVW1d6xudyfhcoWP+0CqPaRToihsOIQFT73Y64rAMK5PRbBJNLAU3oQBIAAAAan1RcZLFxRIYzJTD1K8X9Y2u4Im6H9ROPb2YoAAAAABqfVFxjHdMkoVmOYaR1etoteuKObS21cc1VbIQAAAAABAAAABQcAAAABAgMEBgcABAAAAAMAAAAAAAAA',
            'base64',
        ),
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
    };

    // From Squads transaction D6zTKhuJdvU4aPcgnJrXhaL3AP54AGQKVaiQkikH7fwH
    const squadsLookupTableAccountInfo: AccountInfo<Buffer> = {
        data: Buffer.from(
            'qPqiZFEOos8bpNmzOFnIgq7HtFDkjs0zoH+RjHiREtlTMLrrxCnOoOcFvY3L4K/GkofeZWEMwteLWwiE+IC8lnd8Ck5flvyb3QQAAAAAAAD+AP8AAAAAAQEFBgAAAEq4mP2n8jYC4uvQ/2riMoE0PhxgqIF66HAqkgBn4/7YWvNmtUiOi7IxoG9Yg+DNwzaHxoGjbIgVzFpOmwEZBmf9dPjWz8/N7PpjzVI1TulkO4Egf8ZYe7WLo0OjhhrzoYQzUnBMSyxrGPE/4v6Xp81WeB65mgEPCx6Nm2doqmmMmJEqbWg9L9Do0t/Tr7QiU2rSPiAV6W0bNxo4qIu+aRNLpsNxnQkq2EAyNB4e5Vx8/7kaTXVN+Y+DEOMrcIenQgEAAAAGCgAAAAABAgMEBQcICQowAAAA9r57/qtrEp4AZc0dAAAAAL9A3h92lHzal8AhXk0xQ6drSpPcsjemGX1gSwpnAfeuAQAAAC2j9Rh4Ufp3UyACH6zJgVGpNk7XhltxlBh5LvHTkFE+AAAAAAUAAAA4LwgHBQ==',
            'base64',
        ),
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
    };

    return {
        renderWithContext,
        specificAccountKey,
        squadsAccountInfo,
        squadsLookupTableAccountInfo,
    };
}
