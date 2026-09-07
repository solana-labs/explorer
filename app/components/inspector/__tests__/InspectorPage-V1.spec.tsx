import { render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { InstructionParserProvider } from '@/app/entities/instruction-parser';
import { createV1TransactionBytes } from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { toBase64Url } from '@/app/shared/lib/bytes';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';
import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';

import { ADDRESS_TABLE_LOOKUPS_CARD_TITLE } from '../AddressTableLookupsCard';
import { TransactionInspectorPage } from '../InspectorPage';

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/tx/inspector'),
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
}));

describe('TransactionInspectorPage with a v1 ?message= param', () => {
    beforeEach(async () => {
        const { messageBytes } = parseTransactionBytes(
            createV1TransactionBytes({ computeUnitLimit: 300_000, priorityFeeLamports: 50n }),
        );
        const params = new URLSearchParams();
        params.set('message', toBase64Url(messageBytes));

        vi.spyOn(await import('next/navigation'), 'useSearchParams').mockReturnValue(
            params as unknown as ReturnType<typeof useSearchParams>,
        );
        vi.spyOn(await import('next/navigation'), 'useRouter').mockReturnValue({
            push: vi.fn(),
            replace: vi.fn(),
        } as unknown as ReturnType<typeof useRouter>);

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
        vi.clearAllMocks();
    });

    test('should render the transaction with its resource-limit rows', async () => {
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

        expect(await screen.findByText('Transaction Overview')).toBeInTheDocument();
        expect(screen.queryByText('Inspector Input')).toBeNull();
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.getByText('Compute unit limit')).toBeInTheDocument();
        expect(screen.getByText('300,000')).toBeInTheDocument();
        expect(screen.getByText('Priority fee (total)')).toBeInTheDocument();
        // fee payer, recipient, program
        expect(screen.getByText('Account List (3)')).toBeInTheDocument();
        // v1 messages carry static accounts only, so neither the lookups card nor the
        // lookup-derived account badges appear.
        expect(screen.queryByText(ADDRESS_TABLE_LOOKUPS_CARD_TITLE)).toBeNull();
        expect(screen.queryByText('Address Table Lookup')).toBeNull();
    });
});
