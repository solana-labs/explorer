import {
    type InstructionNode,
    type InstructionSurface,
    InstructionSurfaceProvider,
    TxInstructionSurface,
} from '@entities/instruction-card';
import { PriceType, PYTH_INSTRUCTIONS, PYTH_ORACLE_PROGRAM_IDS, TradingStatus } from '@explorer/decoder-pyth';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
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

import { AddMappingDetailsCard } from '../instructions/AddMappingDetailsCard';
import { AddPriceDetailsCard } from '../instructions/AddPriceDetailsCard';
import { AddProductDetailsCard } from '../instructions/AddProductDetailsCard';
import { AggregatePriceDetailsCard } from '../instructions/AggregatePriceDetailsCard';
import { InitMappingDetailsCard } from '../instructions/InitMappingDetailsCard';
import { InitPriceDetailsCard } from '../instructions/InitPriceDetailsCard';
import { AddPublisherDetailsCard, DeletePublisherDetailsCard } from '../instructions/PublisherDetailsCards';
import { SetMinPublishersDetailsCard } from '../instructions/SetMinPublishersDetailsCard';
import { UpdatePriceDetailsCard, UpdatePriceNoFailOnErrorDetailsCard } from '../instructions/UpdatePriceDetailsCards';
import { UpdateProductDetailsCard } from '../instructions/UpdateProductDetailsCard';

const A = {
    funding: 'FagABcRBhZH27JDtu6A1Jo9woXyoznP28QujLkxkN9Hj',
    mapping: '7txXZZD6Um59YoLMF7XUNimbMjsqsWhc7g2EniiTrmp1',
    nextMapping: 'GgU1RSCbCTNfjPqBGnR7NBDZoLQwB7oEjnHqzGtcCLBH',
    price: '5rATVSqZjaHzMqSJmnbEQNmSJhaKMwsA7Zx2KfBWZBS4',
    product: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    publisher: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    signer: '3EbFtRfKRMTrhPrRQjxbfWCB6NUyTQxwsWTKQFVKgNbb',
} as const;

const key = (base58: string) => new PublicKey(base58);

const PROGRAM_ID = key(PYTH_ORACLE_PROGRAM_IDS.mainnet);
const PROGRAM: string = PROGRAM_ID.toBase58();

const node: InstructionNode = {
    index: 0,
    // The shell only reads `ix` for the Raw view, which these cards never open.
    ix: new TransactionInstruction({ data: Buffer.alloc(0), keys: [], programId: PROGRAM_ID }),
    programId: PROGRAM_ID,
};

const PUBLISHER_INFO = {
    pricePubkey: key(A.price),
    publisherPubkey: key(A.publisher),
    signerPubkey: key(A.signer),
};

const PRICE_UPDATE_INFO = {
    conf: 678,
    price: -12345,
    pricePubkey: key(A.price),
    publishSlot: 170_640_000,
    publisherPubkey: key(A.publisher),
    status: TradingStatus.Trading,
};

/** Each row as `[label, value]`. An address row carries the untruncated address, not the shortened text. */
type Row = [string, string];

const PROGRAM_ROW: Row = ['Program', PROGRAM];

const ATTRIBUTES_JSON = '{\n  "symbol": "BTC/USD",\n  "asset_type": "Crypto"\n}';

/** Publisher and price-update rows repeat across the pairs of cards that share a payload. */
const PUBLISHER_ROWS: Row[] = [PROGRAM_ROW, ['Price Account', A.price], ['Publisher', A.publisher]];

const PRICE_UPDATE_ROWS: Row[] = [
    PROGRAM_ROW,
    ['Publisher', A.publisher],
    ['Price Account', A.price],
    ['Status', 'Trading'],
    ['Price', '-12345'],
    ['Conf', '678'],
    ['Publish Slot', '170640000'],
];

const CASES: Array<{ card: React.ReactElement; rows: Row[]; title: string }> = [
    {
        card: (
            <InitMappingDetailsCard
                node={node}
                info={{ fundingPubkey: key(A.funding), mappingPubkey: key(A.mapping) }}
            />
        ),
        rows: [PROGRAM_ROW, ['Funding Account', A.funding], ['Mapping Account', A.mapping]],
        title: `Pyth: ${PYTH_INSTRUCTIONS.InitMapping.name}`,
    },
    {
        card: (
            <AddMappingDetailsCard
                node={node}
                info={{
                    fundingPubkey: key(A.funding),
                    mappingPubkey: key(A.mapping),
                    nextMappingPubkey: key(A.nextMapping),
                }}
            />
        ),
        rows: [
            PROGRAM_ROW,
            ['Funding Account', A.funding],
            ['Mapping Account', A.mapping],
            ['Next Mapping Account', A.nextMapping],
        ],
        title: `Pyth: ${PYTH_INSTRUCTIONS.AddMapping.name}`,
    },
    {
        card: (
            <AddProductDetailsCard
                node={node}
                info={{
                    fundingPubkey: key(A.funding),
                    mappingPubkey: key(A.mapping),
                    productPubkey: key(A.product),
                }}
            />
        ),
        rows: [
            PROGRAM_ROW,
            ['Funding Account', A.funding],
            ['Mapping Account', A.mapping],
            ['Product Account', A.product],
        ],
        title: `Pyth: ${PYTH_INSTRUCTIONS.AddProduct.name}`,
    },
    {
        card: (
            <AddPriceDetailsCard
                node={node}
                info={{
                    exponent: -9,
                    fundingPubkey: key(A.funding),
                    pricePubkey: key(A.price),
                    priceType: PriceType.Price,
                    productPubkey: key(A.product),
                }}
            />
        ),
        rows: [
            PROGRAM_ROW,
            ['Funding Account', A.funding],
            ['Product Account', A.product],
            ['Price Account', A.price],
            ['Exponent', '-9'],
            ['Price Type', 'Price'],
        ],
        title: `Pyth: ${PYTH_INSTRUCTIONS.AddPrice.name}`,
    },
    {
        // `signerPubkey` is decoded but deliberately unrendered.
        card: <AddPublisherDetailsCard node={node} info={PUBLISHER_INFO} />,
        rows: PUBLISHER_ROWS,
        title: `Pyth: ${PYTH_INSTRUCTIONS.AddPublisher.name}`,
    },
    {
        card: <DeletePublisherDetailsCard node={node} info={PUBLISHER_INFO} />,
        rows: PUBLISHER_ROWS,
        title: `Pyth: ${PYTH_INSTRUCTIONS.DeletePublisher.name}`,
    },
    {
        card: <UpdatePriceDetailsCard node={node} info={PRICE_UPDATE_INFO} />,
        rows: PRICE_UPDATE_ROWS,
        title: `Pyth: ${PYTH_INSTRUCTIONS.UpdatePrice.name}`,
    },
    {
        card: <UpdatePriceNoFailOnErrorDetailsCard node={node} info={PRICE_UPDATE_INFO} />,
        rows: PRICE_UPDATE_ROWS,
        title: `Pyth: ${PYTH_INSTRUCTIONS.UpdatePriceNoFailOnError.name}`,
    },
    {
        card: (
            <AggregatePriceDetailsCard
                node={node}
                info={{ fundingPubkey: key(A.funding), pricePubkey: key(A.price) }}
            />
        ),
        rows: [PROGRAM_ROW, ['Funding Account', A.funding], ['Price Account', A.price]],
        title: `Pyth: ${PYTH_INSTRUCTIONS.AggregatePrice.name}`,
    },
    {
        card: (
            <InitPriceDetailsCard
                node={node}
                info={{
                    exponent: -8,
                    fundingPubkey: key(A.funding),
                    pricePubkey: key(A.price),
                    priceType: PriceType.Price,
                }}
            />
        ),
        rows: [
            PROGRAM_ROW,
            ['Funding Account', A.funding],
            ['Price Account', A.price],
            ['Exponent', '-8'],
            ['Price Type', 'Price'],
        ],
        title: `Pyth: ${PYTH_INSTRUCTIONS.InitPrice.name}`,
    },
    {
        card: (
            <SetMinPublishersDetailsCard
                node={node}
                info={{ fundingPubkey: key(A.funding), minPublishers: 3, pricePubkey: key(A.price) }}
            />
        ),
        rows: [PROGRAM_ROW, ['Funding Account', A.funding], ['Price Account', A.price], ['Min Publishers', '3']],
        title: `Pyth: ${PYTH_INSTRUCTIONS.SetMinPublishers.name}`,
    },
    {
        card: (
            <UpdateProductDetailsCard
                node={node}
                info={{
                    attributes: new Map([
                        ['symbol', 'BTC/USD'],
                        ['asset_type', 'Crypto'],
                    ]),
                    fundingPubkey: key(A.funding),
                    productPubkey: key(A.product),
                }}
            />
        ),
        rows: [
            PROGRAM_ROW,
            ['Funding Account', A.funding],
            ['Product Account', A.product],
            // Attributes keep decode order, and the cell draws them twice — once per responsive alignment.
            ['Attributes (JSON)', ATTRIBUTES_JSON + ATTRIBUTES_JSON],
        ],
        title: `Pyth: ${PYTH_INSTRUCTIONS.UpdateProduct.name}`,
    },
];

describe('instruction-program-pyth cards', () => {
    /** Pins each card's rows: label, order, count, and the value every row resolves to. */
    it.each(CASES)('should render the rows of $title', async ({ card, rows, title }) => {
        renderCard(card);

        // The cluster provider finishes an async fetch after mount, so assert inside waitFor.
        await waitFor(() => {
            expect(readRows()).toEqual(rows);
        });

        expect(screen.getByText(title)).toBeInTheDocument();
    });

    // Distinct titles, so a card cannot be mistaken for its same-payload twin.
    it('should title Aggregate Price and the two price updates apart', () => {
        const titles = CASES.map(({ title }) => title);
        expect(new Set(titles).size).toBe(titles.length);
    });

    // A foreign program id proves the row reads the node rather than a Pyth constant.
    it('should render the program row from the node', async () => {
        renderCard(
            <AggregatePriceDetailsCard
                node={{ ...node, programId: key(A.funding) }}
                info={{ fundingPubkey: key(A.funding), pricePubkey: key(A.price) }}
            />,
        );

        await waitFor(() => {
            expect(readRows()[0]).toEqual(['Program', A.funding]);
        });
    });

    it('should draw every address with the surface address renderer', () => {
        render(
            <InstructionSurfaceProvider surface={STUB_SURFACE}>
                <UpdatePriceDetailsCard node={node} info={PRICE_UPDATE_INFO} />
            </InstructionSurfaceProvider>,
        );

        expect(screen.getAllByTestId('surface-address').map(el => el.textContent)).toEqual([A.publisher, A.price]);
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
    const card = screen.getAllByRole('table')[0];
    return within(card)
        .getAllByRole('row')
        .filter(row => row.closest('table') === card)
        .map(row => {
            const cells = within(row).getAllByRole('cell');
            return [cells[0].textContent ?? '', readAddresses(cells[1]) ?? cells[1]?.textContent ?? ''];
        });
}

/** Comma-joined so a multi-address cell pins every entry and their order, not just the first. */
function readAddresses(cell: HTMLElement | undefined): string | undefined {
    // eslint-disable-next-line testing-library/no-node-access -- an address has no role to query by
    const addresses = [...(cell?.querySelectorAll('[data-address]') ?? [])].map(el => el.getAttribute('data-address'));
    return addresses.length > 0 ? addresses.join(',') : undefined;
}
