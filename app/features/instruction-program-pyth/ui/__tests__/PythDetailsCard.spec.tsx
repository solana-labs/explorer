import { TxInstructionSurface } from '@entities/instruction-card';
import {
    PYTH_INSTRUCTION_TYPES,
    PYTH_INSTRUCTIONS,
    PYTH_ORACLE_PROGRAM_IDS,
    type PythInstructionType,
} from '@explorer/decoder-pyth';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
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

import { PythDetailsCard } from '../PythDetailsCard';

const PROGRAM_ID = new PublicKey(PYTH_ORACLE_PROGRAM_IDS.mainnet);
const PUBLISHER = new PublicKey('4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi');

const KEYS = [
    'FagABcRBhZH27JDtu6A1Jo9woXyoznP28QujLkxkN9Hj',
    '7txXZZD6Um59YoLMF7XUNimbMjsqsWhc7g2EniiTrmp1',
    'GgU1RSCbCTNfjPqBGnR7NBDZoLQwB7oEjnHqzGtcCLBH',
].map(key => ({ isSigner: false, isWritable: false, pubkey: new PublicKey(key) }));

const UNKNOWN_TITLE = 'Pyth: Unknown Instruction';

const PRICE_UPDATE = [u32(1), u32(0), i64(-12345n), u64(678n), u64(170_640_000n)];
const PRICE_ACCOUNT = [u32(0xffff_fff7), u32(1)];

/** Real wire bytes per instruction, so a mis-keyed index routes to the wrong card and fails here. */
const PAYLOADS: Record<PythInstructionType, number[][]> = {
    AddMapping: [],
    AddPrice: PRICE_ACCOUNT,
    AddProduct: [],
    AddPublisher: [[...PUBLISHER.toBytes()]],
    AggregatePrice: [],
    DeletePublisher: [[...PUBLISHER.toBytes()]],
    InitMapping: [],
    InitPrice: PRICE_ACCOUNT,
    InitTest: [],
    SetMinPublishers: [[3], [0, 0, 0]],
    UpdatePrice: PRICE_UPDATE,
    UpdatePriceNoFailOnError: PRICE_UPDATE,
    UpdateProduct: [],
    UpdateTest: [],
};

/** The two test instructions carry no payload, so they open on raw hex under their own name. */
const RAW_ONLY: PythInstructionType[] = ['InitTest', 'UpdateTest'];

const WITH_CARD = PYTH_INSTRUCTION_TYPES.filter(type => !RAW_ONLY.includes(type));

describe('PythDetailsCard dispatch', () => {
    beforeEach(() => {
        vi.mocked(Logger.error).mockClear();
    });

    it.each(WITH_CARD)('should render the %s card', async type => {
        renderCard(pythInstruction(type));

        await waitFor(() => {
            expect(screen.getByText(`Pyth: ${PYTH_INSTRUCTIONS[type].name}`)).toBeInTheDocument();
        });
        expect(Logger.error).not.toHaveBeenCalled();
    });

    it.each(RAW_ONLY)('should render %s as a raw-only card under its own name', async type => {
        renderCard(pythInstruction(type));

        await waitFor(() => {
            expect(screen.getByText(`Pyth: ${PYTH_INSTRUCTIONS[type].name}`)).toBeInTheDocument();
        });
        expect(screen.queryByText(UNKNOWN_TITLE)).not.toBeInTheDocument();
        // Nothing failed — these two simply have no fields to tabulate.
        expect(Logger.error).not.toHaveBeenCalled();
    });

    it('should fall back and report an unsupported version', async () => {
        renderCard(rawInstruction([...u32(1), ...u32(0)]));

        await waitFor(() => {
            expect(screen.getByText(UNKNOWN_TITLE)).toBeInTheDocument();
        });
        expect(Logger.error).toHaveBeenCalled();
    });

    it('should fall back and report an index no instruction uses', async () => {
        renderCard(rawInstruction([...u32(2), ...u32(14)]));

        await waitFor(() => {
            expect(screen.getByText(UNKNOWN_TITLE)).toBeInTheDocument();
        });
        expect(Logger.error).toHaveBeenCalled();
    });

    it('should fall back and report a payload too short for its instruction', async () => {
        renderCard(rawInstruction([...u32(2), ...u32(PYTH_INSTRUCTIONS.AddPrice.index)]));

        await waitFor(() => {
            expect(screen.getByText(UNKNOWN_TITLE)).toBeInTheDocument();
        });
        expect(Logger.error).toHaveBeenCalled();
    });

    // The node is assembled here, so a dropped field silently loses the CPI children or misnumbers the card.
    it('should carry inner cards and the nested position onto the shell', async () => {
        renderCard(pythInstruction('InitMapping'), {
            childIndex: 2,
            index: 3,
            innerCards: [<div key="inner">an inner instruction</div>],
        });

        await waitFor(() => {
            expect(screen.getByText('Inner Instructions')).toBeInTheDocument();
        });
        expect(screen.getByText('an inner instruction')).toBeInTheDocument();
        expect(screen.getByText('#4.3')).toBeInTheDocument();
    });
});

function u32(value: number): number[] {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return [...bytes];
}

function u64(value: bigint): number[] {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, value, true);
    return [...bytes];
}

function i64(value: bigint): number[] {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigInt64(0, value, true);
    return [...bytes];
}

function pythInstruction(type: PythInstructionType): TransactionInstruction {
    return rawInstruction([...u32(2), ...u32(PYTH_INSTRUCTIONS[type].index), ...PAYLOADS[type].flat()]);
}

function rawInstruction(data: number[]): TransactionInstruction {
    return new TransactionInstruction({ data: Buffer.from(data), keys: KEYS, programId: PROGRAM_ID });
}

function renderCard(
    ix: TransactionInstruction,
    props: { childIndex?: number; index?: number; innerCards?: JSX.Element[] } = {},
) {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>
                            <PythDetailsCard ix={ix} index={0} signature="sig" {...props} />
                        </TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}
