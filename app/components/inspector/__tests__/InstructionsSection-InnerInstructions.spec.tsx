/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { useIdlInstructionDecode } from '@features/decode-instruction-with-idl';
import { getBase58Decoder } from '@solana/kit';
import type { CompiledInnerInstruction } from '@solana/web3.js';
import { MessageV0, PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { InstructionParserProvider } from '@/app/entities/instruction-parser';
import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { TransactionsProvider } from '@/app/providers/transactions';
import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';

import { InstructionsSection } from '../InstructionsSection';

// `useAnchorProgram` (checked before the program switch) reads through SWR;
// stub it to "no IDL" so the byte instructions fall through to the dispatcher.
vi.mock('swr', () => ({
    __esModule: true,
    default: vi.fn(() => ({
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
    })),
}));

// Defaults to "no IDL"; the batch test overrides it. Only the hook is stubbed — the cards it routes to
// stay real, since which card wins is the thing under test.
vi.mock('@features/decode-instruction-with-idl', async importOriginal => ({
    ...(await importOriginal<typeof import('@features/decode-instruction-with-idl')>()),
    useIdlInstructionDecode: vi.fn(() => undefined),
}));

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/'),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
    useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('Inspector InstructionsSection with inner instructions', () => {
    afterEach(() => {
        vi.mocked(useIdlInstructionDecode).mockReturnValue(undefined);
    });

    test('should render a card per inner instruction under its parent', async () => {
        const { container } = render(
            <ScrollAnchorProvider>
                <ClusterProvider>
                    <TransactionsProvider>
                        <AccountsProvider>
                            <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                                <InstructionsSection
                                    message={buildMessage()}
                                    compiledInnerInstructions={INNER_INSTRUCTIONS}
                                />
                            </InstructionParserProvider>
                        </AccountsProvider>
                    </TransactionsProvider>
                </ClusterProvider>
            </ScrollAnchorProvider>,
        );

        // The header only renders when the parent card is handed children — the bug was
        // that the inspector built none unless they were Squads token batches.
        expect(await screen.findByText(/Inner Instructions/i)).toBeInTheDocument();

        // One card per CPI the RPC reported, numbered under its parent.
        const rendered = container.textContent ?? '';
        expect(rendered).toContain('#1.1');
        expect(rendered).toContain('#1.2');
        expect(rendered).toContain('#1.3');
        expect(rendered).toContain('#1.4');

        // A child went through the shared dispatcher, not just a raw dump. The three Token
        // CPIs land on the raw card here because this test stubs the IDL tier away and the
        // dispatcher has no byte decoder for those discriminators — unrelated to nesting.
        expect(await screen.findByText(/System Program: Create Account/i)).toBeInTheDocument();
    });

    test('should render an inner token batch as a batch card, not through the IDL tier', async () => {
        // The Token program resolves an IDL on mainnet, and the tier never answers undefined — it
        // returns `{ kind: 'unknown' }` for a discriminator the IDL does not declare. If that tier ran
        // first, a batch would draw a raw card instead of the curated one.
        vi.mocked(useIdlInstructionDecode).mockReturnValue({ kind: 'unknown' });

        render(
            <ScrollAnchorProvider>
                <ClusterProvider>
                    <TransactionsProvider>
                        <AccountsProvider>
                            <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                                <InstructionsSection message={buildMessage()} compiledInnerInstructions={INNER_BATCH} />
                            </InstructionParserProvider>
                        </AccountsProvider>
                    </TransactionsProvider>
                </ClusterProvider>
            </ScrollAnchorProvider>,
        );

        expect(await screen.findByText(/Token Program: Batch \(1 instruction\)/i)).toBeInTheDocument();
    });

    test('should number a child it cannot decompile so the siblings keep their positions', async () => {
        render(
            <ScrollAnchorProvider>
                <ClusterProvider>
                    <TransactionsProvider>
                        <AccountsProvider>
                            <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                                <InstructionsSection
                                    message={buildMessage()}
                                    compiledInnerInstructions={INNER_WITH_BAD_ACCOUNT}
                                />
                            </InstructionParserProvider>
                        </AccountsProvider>
                    </TransactionsProvider>
                </ClusterProvider>
            </ScrollAnchorProvider>,
        );

        expect(await screen.findByText(/Could not display instruction #1\.2, please report/i)).toBeInTheDocument();

        // The child after the hole still reads as the third, not the second.
        const rendered = document.body.textContent ?? '';
        expect(rendered).toContain('#1.1');
        expect(rendered).toContain('#1.3');
    });

    test('should render no inner cards when the transaction carries no metadata', async () => {
        render(
            <ScrollAnchorProvider>
                <ClusterProvider>
                    <TransactionsProvider>
                        <AccountsProvider>
                            <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                                <InstructionsSection message={buildMessage()} />
                            </InstructionParserProvider>
                        </AccountsProvider>
                    </TransactionsProvider>
                </ClusterProvider>
            </ScrollAnchorProvider>,
        );

        expect(await screen.findByText(/Create Idempotent/i)).toBeInTheDocument();
        expect(screen.queryByText(/Inner Instructions/i)).not.toBeInTheDocument();
    });
});

const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const COMPUTE_BUDGET_PROGRAM = new PublicKey('ComputeBudget111111111111111111111111111111');

// The account list of the transaction in HOO-611, in wire order.
const ACCOUNT_KEYS = [
    new PublicKey('37vWB5RfLRpnhNobhzmwCRGZbynGd4je2NvppSjUsEdJ'), // 0 fee payer
    new PublicKey('4aa42XQFo45wc2PHQH21vahuyuFYCEZAH4G27xpGYqf6'), // 1 source token account
    new PublicKey('CFRWXYp8zc2ftkF2Bv8jXmQu1qW67goZjSkKMjv6UV3P'), // 2 associated token account
    SYSTEM_PROGRAM, // 3
    new PublicKey('AGRidUXLeDij9CJprkZx7WBXtTQC67jtfiwz293mVrJ'), // 4 mint
    COMPUTE_BUDGET_PROGRAM, // 5
    TOKEN_PROGRAM, // 6
    new PublicKey('97PALEbpPj7muiQqi2HXS8QukLsrrr1yfgKfvXjWtsUG'), // 7 wallet
    ATA_PROGRAM, // 8
];

// The four CPIs the RPC reports for the Create Idempotent instruction, verbatim
// from `getTransaction`: GetAccountDataSize, CreateAccount, InitializeImmutableOwner,
// InitializeAccount3. None is a token batch, which is why the inspector dropped them all.
const INNER_INSTRUCTIONS: CompiledInnerInstruction[] = [
    {
        index: 0,
        instructions: [
            { accounts: [4], data: '84eT', programIdIndex: 6 },
            {
                accounts: [0, 2],
                data: '11119os1e9qSs2u7TsThXqkBSRVFxhmYaFKFZ1waB2X7armDmvK3p5GmLdUxYdg3h7QSrL',
                programIdIndex: 3,
            },
            { accounts: [2], data: 'P', programIdIndex: 6 },
            { accounts: [2, 4], data: '6VF5qGS8cgaPcBCWMoBUrv6rJFETgGbHgNbVXR7RLC1uE', programIdIndex: 6 },
        ],
    },
];

// One inner instruction on the Token program carrying the batch discriminator (255), wrapping a
// single Transfer of 100 over its three accounts (source, destination, authority).
const INNER_BATCH: CompiledInnerInstruction[] = [
    {
        index: 0,
        instructions: [
            {
                accounts: [1, 2, 0],
                data: encodeBase58([255, 3, 9, 3, 100, 0, 0, 0, 0, 0, 0, 0]),
                programIdIndex: 6,
            },
        ],
    },
];

// Three CPIs whose middle one names an account index the message does not have.
const INNER_WITH_BAD_ACCOUNT: CompiledInnerInstruction[] = [
    {
        index: 0,
        instructions: [
            { accounts: [4], data: '84eT', programIdIndex: 6 },
            { accounts: [0, 99], data: 'P', programIdIndex: 6 },
            {
                accounts: [0, 2],
                data: '11119os1e9qSs2u7TsThXqkBSRVFxhmYaFKFZ1waB2X7armDmvK3p5GmLdUxYdg3h7QSrL',
                programIdIndex: 3,
            },
        ],
    },
];

// A single Create Idempotent instruction over the account list above. Only the parent
// matters here — the other two top-level instructions of the real transaction have no
// CPIs of their own.
function buildMessage(): MessageV0 {
    return new MessageV0({
        addressTableLookups: [],
        compiledInstructions: [
            {
                accountKeyIndexes: [0, 2, 7, 4, 3, 6],
                data: new Uint8Array([1]),
                programIdIndex: 8,
            },
        ],
        header: {
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 6,
            numRequiredSignatures: 1,
        },
        recentBlockhash: new PublicKey(new Uint8Array(32)).toBase58(),
        staticAccountKeys: ACCOUNT_KEYS,
    });
}

function encodeBase58(bytes: number[]): string {
    return getBase58Decoder().decode(new Uint8Array(bytes));
}
