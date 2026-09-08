import {
    type InstructionNode,
    type InstructionSurface,
    InstructionSurfaceProvider,
    TxInstructionSurface,
} from '@entities/instruction-card';
import { AddressLookupTableProgram, type ParsedInstruction, PublicKey } from '@solana/web3.js';
import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: vi.fn(() => ({ push: vi.fn() })),
    useSearchParams: vi.fn(() => ({ get: vi.fn(), has: vi.fn(), toString: () => '' })),
}));

import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { TransactionsProvider } from '@/app/providers/transactions';

import { CloseLookupTableDetailsCard } from '../address-lookup-table/CloseLookupTableDetails';
import { CreateLookupTableDetailsCard } from '../address-lookup-table/CreateLookupTableDetails';
import { DeactivateLookupTableDetailsCard } from '../address-lookup-table/DeactivateLookupTableDetails';
import { ExtendLookupTableDetailsCard } from '../address-lookup-table/ExtendLookupTableDetails';
import { FreezeLookupTableDetailsCard } from '../address-lookup-table/FreezeLookupTableDetails';

const A = {
    authority: '3EbFtRfKRMTrhPrRQjxbfWCB6NUyTQxwsWTKQFVKgNbb',
    entryOne: '5rATVSqZjaHzMqSJmnbEQNmSJhaKMwsA7Zx2KfBWZBS4',
    entryTwo: '6dNUCJLdccKGSSQvQDNvQMKfWiV5j3XSTTGqNsCJ8mSA',
    payer: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    recipient: '4QUZQ4c7bZuJ4o4L8tYAEGnePFV27SUFEVmC7BYfsXRp',
    table: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
} as const;

const key = (base58: string) => new PublicKey(base58);

const PROGRAM_ID = AddressLookupTableProgram.programId;
const PROGRAM: string = PROGRAM_ID.toBase58();

const RECENT_SLOT = 123_456_789;
const BUMP_SEED = 255;

const node: InstructionNode = {
    index: 0,
    // The shell only reads `ix` for the Raw view, which these cards never open.
    ix: { parsed: {}, program: 'address-lookup-table', programId: PROGRAM_ID } as unknown as ParsedInstruction,
    programId: PROGRAM_ID,
};

const TABLE = { lookupTableAccount: key(A.table), lookupTableAuthority: key(A.authority) };

/** Each row as `[label, value]`. An address row carries the untruncated address, not the shortened text. */
type Row = [string, string];

const LOOKUP_TABLE_ROWS: Row[] = [
    ['Program', PROGRAM],
    ['Lookup Table', A.table],
    ['Lookup Table Authority', A.authority],
];

/** Freeze, Deactivate and Close render identical rows, so only the title tells them apart. */
const CASES: Array<{ card: React.ReactElement; rows: Row[]; title: string }> = [
    {
        card: <FreezeLookupTableDetailsCard node={node} info={TABLE} />,
        rows: LOOKUP_TABLE_ROWS,
        title: 'Address Lookup Table: Freeze Lookup Table',
    },
    {
        card: <DeactivateLookupTableDetailsCard node={node} info={TABLE} />,
        rows: LOOKUP_TABLE_ROWS,
        title: 'Address Lookup Table: Deactivate Lookup Table',
    },
    {
        // `recipient` is validated but deliberately unrendered, as on master.
        card: <CloseLookupTableDetailsCard node={node} info={{ ...TABLE, recipient: key(A.recipient) }} />,
        rows: LOOKUP_TABLE_ROWS,
        title: 'Address Lookup Table: Close Lookup Table',
    },
    {
        card: (
            <CreateLookupTableDetailsCard
                node={node}
                info={{
                    ...TABLE,
                    bumpSeed: BUMP_SEED,
                    payerAccount: key(A.payer),
                    recentSlot: RECENT_SLOT,
                    // Validated but unrendered, as on master.
                    systemProgram: key('11111111111111111111111111111111'),
                }}
            />
        ),
        rows: [
            ...LOOKUP_TABLE_ROWS,
            ['Payer Account', A.payer],
            ['Recent Slot', RECENT_SLOT.toLocaleString('en-US')],
            ['Bump Seed', String(BUMP_SEED)],
        ],
        title: 'Address Lookup Table: Create Lookup Table',
    },
    {
        card: (
            <ExtendLookupTableDetailsCard
                node={node}
                info={{ ...TABLE, newAddresses: [key(A.entryOne), key(A.entryTwo)] }}
            />
        ),
        rows: [...LOOKUP_TABLE_ROWS, ['New Addresses', [A.entryOne, A.entryTwo].join(',')]],
        title: 'Address Lookup Table: Extend Lookup Table',
    },
];

describe('instruction::address-lookup-table cards', () => {
    /** Pins each card's rows: label, order, count, and the value every row resolves to. */
    it.each(CASES)('should render the rows of $title', async ({ card, rows, title }) => {
        renderCard(card);

        // The cluster provider finishes an async fetch after mount, so assert inside waitFor.
        await waitFor(() => {
            expect(readRows()).toEqual(rows);
        });

        expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('should number the new addresses in extend order', async () => {
        renderCard(
            <ExtendLookupTableDetailsCard
                node={node}
                info={{ ...TABLE, newAddresses: [key(A.entryOne), key(A.entryTwo)] }}
            />,
        );

        await waitFor(() => {
            expect(readNewAddresses()).toEqual([
                ['0', A.entryOne],
                ['1', A.entryTwo],
            ]);
        });
    });

    it('should link the recent slot to its block', async () => {
        renderCard(
            <CreateLookupTableDetailsCard
                node={node}
                info={{
                    ...TABLE,
                    bumpSeed: BUMP_SEED,
                    payerAccount: key(A.payer),
                    recentSlot: RECENT_SLOT,
                    systemProgram: key('11111111111111111111111111111111'),
                }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole('link', { name: RECENT_SLOT.toLocaleString('en-US') })).toHaveAttribute(
                'href',
                expect.stringContaining(`/block/${RECENT_SLOT}`),
            );
        });
    });

    // Extend draws its own nested markup, so nothing but this stops it from
    // hardcoding the transaction page's address renderer for the entries.
    it('should draw every address with the surface address renderer', () => {
        render(
            <InstructionSurfaceProvider surface={STUB_SURFACE}>
                <ExtendLookupTableDetailsCard
                    node={node}
                    info={{ ...TABLE, newAddresses: [key(A.entryOne), key(A.entryTwo)] }}
                />
            </InstructionSurfaceProvider>,
        );

        expect(screen.getAllByTestId('surface-address').map(el => el.textContent)).toEqual([
            A.table,
            A.authority,
            A.entryOne,
            A.entryTwo,
        ]);
    });

    // A foreign program id proves the row reads the node rather than an ALT-program constant.
    it('should render the program row from the node', async () => {
        renderCard(<FreezeLookupTableDetailsCard node={{ ...node, programId: key(A.authority) }} info={TABLE} />);

        await waitFor(() => {
            expect(readRows()[0]).toEqual(['Program', A.authority]);
        });
    });
});

/** A surface that renders nothing of its own, so only what a card asks of it shows up. */
const STUB_SURFACE: InstructionSurface = {
    Address: ({ pubkey }) => <span data-testid="surface-address">{pubkey.toBase58()}</span>,
    Shell: ({ children }) => <table>{children}</table>,
    result: { err: null },
    showProgramField: false,
};

function renderCard(card: React.ReactElement) {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>{card}</TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}

/**
 * The card's own rows in render order, so the result pins row order as well as content.
 * Addresses are read from `data-address`, which carries the untruncated value the display
 * shortens; every other kind falls back to its rendered text, so a wrong value fails rather
 * than reading as an empty cell.
 */
function readRows(): Row[] {
    const card = cardTable();
    return within(card)
        .getAllByRole('row')
        .filter(row => row.closest('table') === card)
        .map(row => {
            const cells = within(row).getAllByRole('cell');
            return [cells[0].textContent ?? '', readAddresses(cells[1]) ?? cells[1]?.textContent ?? ''];
        });
}

/** The nested table Extend draws, as `[index, address]` pairs. */
function readNewAddresses(): Row[] {
    const [, nested] = screen.getAllByRole('table');
    return within(nested)
        .getAllByRole('row')
        .map(row => {
            const cells = within(row).getAllByRole('cell');
            return [cells[0].textContent ?? '', readAddresses(cells[1]) ?? ''];
        });
}

function cardTable(): HTMLElement {
    return screen.getAllByRole('table')[0];
}

/** Comma-joined so a multi-address cell pins every entry and their order, not just the first. */
function readAddresses(cell: HTMLElement | undefined): string | undefined {
    // eslint-disable-next-line testing-library/no-node-access -- an address has no role to query by
    const addresses = [...(cell?.querySelectorAll('[data-address]') ?? [])].map(el => el.getAttribute('data-address'));
    return addresses.length > 0 ? addresses.join(',') : undefined;
}
