import { TxInstructionSurface } from '@entities/instruction-card';
import { type ParsedInstruction, PublicKey } from '@solana/web3.js';
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

import { MemoDetailsCard } from '../MemoDetailsCard';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

describe('MemoDetailsCard', () => {
    it('should render the memo payload and the program row', async () => {
        renderCard(memoInstruction('gm'));

        await waitFor(() => {
            expect(readRows()).toEqual([
                ['Program', MEMO_PROGRAM_ID.toBase58()],
                ['Data (UTF-8)', 'gm'],
            ]);
        });

        expect(screen.getByText('Memo Program: Memo')).toBeInTheDocument();
    });

    // A memo is free-form text of any length, so the card breaks it rather than letting it stretch the row.
    it('should break a memo longer than a line', async () => {
        const memo = 'a'.repeat(120);

        renderCard(memoInstruction(memo));

        await waitFor(() => {
            expect(readRows()[1]).toEqual([
                'Data (UTF-8)',
                ['a'.repeat(50), 'a'.repeat(50), 'a'.repeat(20)].join('\n'),
            ]);
        });
    });

    // A foreign program id proves the row reads the node rather than a memo-program constant.
    it('should render the program row from the node', async () => {
        const legacyMemoProgram = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo');

        renderCard({ ...memoInstruction('gm'), programId: legacyMemoProgram });

        await waitFor(() => {
            expect(readRows()[0]).toEqual(['Program', legacyMemoProgram.toBase58()]);
        });
    });
});

function memoInstruction(memo: string): ParsedInstruction {
    return { parsed: memo, program: 'spl-memo', programId: MEMO_PROGRAM_ID };
}

function renderCard(ix: ParsedInstruction) {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>
                            <MemoDetailsCard ix={ix} index={0} />
                        </TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}

/** Each row as `[label, value]`, in render order, so the result pins order as well as content. */
function readRows(): Array<[string, string]> {
    const card = screen.getAllByRole('table')[0];
    return within(card)
        .getAllByRole('row')
        .map(row => {
            const cells = within(row).getAllByRole('cell');
            return [cells[0].textContent ?? '', readAddress(cells[1]) ?? cells[1]?.textContent ?? ''];
        });
}

function readAddress(cell: HTMLElement | undefined): string | undefined {
    return cell?.querySelector('[data-address]')?.getAttribute('data-address') ?? undefined;
}
