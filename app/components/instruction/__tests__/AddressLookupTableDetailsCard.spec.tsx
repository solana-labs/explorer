import { TxInstructionSurface } from '@entities/instruction-card';
import { AddressLookupTableProgram, type ParsedInstruction, type ParsedTransaction } from '@solana/web3.js';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: vi.fn(() => ({ push: vi.fn() })),
    useSearchParams: vi.fn(() => ({ get: vi.fn(), has: vi.fn(), toString: () => '' })),
}));

vi.mock('@/app/shared/lib/logger', () => ({ Logger: { error: vi.fn() } }));

import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { TransactionsProvider } from '@/app/providers/transactions';
import { Logger } from '@/app/shared/lib/logger';

import { AddressLookupTableDetailsCard } from '../AddressLookupTableDetailsCard';

const A = {
    authority: '3EbFtRfKRMTrhPrRQjxbfWCB6NUyTQxwsWTKQFVKgNbb',
    entry: '5rATVSqZjaHzMqSJmnbEQNmSJhaKMwsA7Zx2KfBWZBS4',
    payer: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    recipient: '4QUZQ4c7bZuJ4o4L8tYAEGnePFV27SUFEVmC7BYfsXRp',
    system: '11111111111111111111111111111111',
    table: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
} as const;

const TABLE = { lookupTableAccount: A.table, lookupTableAuthority: A.authority };

const CREATE = {
    ...TABLE,
    bumpSeed: 255,
    payerAccount: A.payer,
    recentSlot: 123_456_789,
    systemProgram: A.system,
};

/** Freeze, Deactivate and Close render identical rows, so a mis-routed type still looks plausible. */
const DISPATCH: Array<{ info: unknown; title: string; type: string }> = [
    { info: CREATE, title: 'Address Lookup Table: Create Lookup Table', type: 'createLookupTable' },
    {
        info: { ...TABLE, newAddresses: [A.entry] },
        title: 'Address Lookup Table: Extend Lookup Table',
        type: 'extendLookupTable',
    },
    { info: TABLE, title: 'Address Lookup Table: Freeze Lookup Table', type: 'freezeLookupTable' },
    { info: TABLE, title: 'Address Lookup Table: Deactivate Lookup Table', type: 'deactivateLookupTable' },
    {
        info: { ...TABLE, recipient: A.recipient },
        title: 'Address Lookup Table: Close Lookup Table',
        type: 'closeLookupTable',
    },
];

describe('instruction::AddressLookupTableDetailsCard dispatch', () => {
    beforeEach(() => {
        vi.mocked(Logger.error).mockClear();
    });

    it.each(DISPATCH)('should render $title for $type', async ({ info, title, type }) => {
        renderCard(info, type);

        await waitFor(() => {
            expect(screen.getByText(title)).toBeInTheDocument();
        });
        expect(Logger.error).not.toHaveBeenCalled();
    });

    // A single union used to validate every type, and `type()` let the loosest member win —
    // so extend payloads were checked against the freeze schema and `newAddresses` reached
    // the card as raw strings. Pin the coercion each type's own schema now performs.
    it('should coerce the extend addresses through the extend schema', async () => {
        renderCard({ ...TABLE, newAddresses: [A.entry] }, 'extendLookupTable');

        await waitFor(() => {
            expect(screen.getByText('Address Lookup Table: Extend Lookup Table')).toBeInTheDocument();
        });
        // eslint-disable-next-line testing-library/no-node-access -- an address has no role to query by
        expect(document.querySelector(`[data-address="${A.entry}"]`)).toBeInTheDocument();
    });

    it('should fall back to the unknown card for an unrecognized type', async () => {
        renderCard(TABLE, 'resizeLookupTable');

        await waitFor(() => {
            expect(screen.getByText('Address Lookup Table Program: Unknown Instruction')).toBeInTheDocument();
        });
    });

    // Each type is now validated against its own schema, so a payload missing a
    // field that type requires no longer slips through a looser sibling.
    it('should fall back and report when a payload misses a required field', async () => {
        renderCard(TABLE, 'closeLookupTable');

        await waitFor(() => {
            expect(screen.getByText('Address Lookup Table Program: Unknown Instruction')).toBeInTheDocument();
        });
        expect(Logger.error).toHaveBeenCalled();
    });
});

function renderCard(info: unknown, type: string) {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>
                            <AddressLookupTableDetailsCard
                                tx={{ signatures: ['sig'] } as ParsedTransaction}
                                ix={
                                    {
                                        parsed: { info, type },
                                        program: 'address-lookup-table',
                                        programId: AddressLookupTableProgram.programId,
                                    } as unknown as ParsedInstruction
                                }
                                result={{ err: null }}
                                index={0}
                            />
                        </TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}
