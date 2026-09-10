import { TxInstructionSurface } from '@entities/instruction-card';
import { getBase58Decoder } from '@solana/kit';
import { ParsedTransaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
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

import { Ed25519DetailsCard } from '../Ed25519DetailsCard';

const BASE58_DECODER = getBase58Decoder();

const PROGRAM_ID = new PublicKey('Ed25519SigVerify111111111111111111111111111');

const TITLE = 'Ed25519: Verify Signature';

/** Each row as `[label, value]`; a heading fills the row, so it reads as a label alone. */
type Row = [string, string];

describe('Ed25519DetailsCard', () => {
    // 56JcSVYUPr8hdg8q2bfDhiPm5W9XQtr45VEevK9ye6Ec7DcyvD9CvnDgUoQhL3eQEmz32RRtLcaRdU9xyaDyCLiT (devnet)
    it('should render a signature whose bytes live in another instruction', async () => {
        const ed25519Ix = ed25519Instruction(fromHex('01000c0001004c0001006e008a000100'));
        const referenced = {
            data: BASE58_DECODER.decode(
                Buffer.from(
                    '3259784efe0f688cec00000037d6acf4b3c9628b3485f398ed7baa20c37c4dff8ebee937456adea100d27c923e097cb0f41c9ff752efc7ed06db3c28bcf867f3ca203cde9222e72d1e93d503395311d51c1b87fd56c3b5872d1041111e51f399b12d291d981a0ea3834072958a00303030313031303034303432306630303030303030303030303030303030303030303030303030303031303030303030303030303030303030303031633830313939353235653733313730303030303030313330646465643337313730303030303030303030633866373165313530303030303030303334373337303431353433343533343830303030',
                    'hex',
                ),
            ),
            programId: new PublicKey('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'),
        };

        renderCard(ed25519Ix, transaction(ed25519Ix, referenced));

        await waitFor(() => {
            expect(readRows()).toEqual([
                ['Program', PROGRAM_ID.toBase58()],
                ['Signature #1', ''],
                ['Signature Reference', 'Instruction 1, Offset 12'],
                [
                    'Signature',
                    'N9as9LPJYos0hfOY7XuqIMN8Tf+Ovuk3RWreoQDSfJI+CXyw9Byf91Lvx+0G2zwovPhn88ogPN6SIuctHpPVAw==',
                ],
                ['Public Key Reference', 'Instruction 1, Offset 76'],
                ['Public Key', '4rmhwytmKH1XsgGAUyUUH7U64HS5FtT6gM8HGKAfwcFE'],
                ['Message Reference', 'Instruction 1, Offset 110, Size 138'],
                [
                    'Message',
                    'MDAwMTAxMDA0MDQyMGYwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAxMDAwMDAwMDAwMDAwMDAwMDAxYzgwMTk5NTI1ZTczMTcwMDAwMDAwMTMwZGRlZDM3MTcwMDAwMDAwMDAwYzhmNzFlMTUwMDAwMDAwMDM0NzM3MDQxNTQzNDUzNDgwMDAw',
                ],
            ]);
        });

        expect(screen.getByText(TITLE)).toBeInTheDocument();
    });

    // XBHwdBYNu8J326yKeHiRyEudMaFVhz3Pb6ahgcfceRLV6kbmd14Z8vE6YnV4zu5WWNESmvhxmjUj4CpoQmwwhLJ
    it('should render a signature that carries its own bytes', async () => {
        const ed25519Ix = ed25519Instruction(
            fromHex(
                '01003000ffff1000ffff70002000ffff8f2ed8bcd09b724040a0fc59ce9b5ea78525b6054def83d68f3a3930aa76e5bd4c105e1989c4d276372c97a5efb79d89bcc78f094f155be1b369e62e8b7eb42f42b3341f6be3b5c6f13a176fd7ca32323bf759c547126117365dccdae56e180f07932bbeab087035132975788c9af2a2c1a63e371e0866efcdb5a1952a1d2422',
            ),
        );

        renderCard(ed25519Ix, transaction(ed25519Ix));

        await waitFor(() => {
            expect(readRows()).toEqual([
                ['Program', PROGRAM_ID.toBase58()],
                ['Signature #1', ''],
                ['Signature Reference', 'This instruction, Offset 48'],
                [
                    'Signature',
                    'TBBeGYnE0nY3LJel77edibzHjwlPFVvhs2nmLot+tC9CszQfa+O1xvE6F2/XyjIyO/dZxUcSYRc2Xcza5W4YDw==',
                ],
                ['Public Key Reference', 'This instruction, Offset 16'],
                ['Public Key', 'AdvjU3gzNNXxASXEKBHovk3xAjFxQVn1UX6fUdgSvnS8'],
                ['Message Reference', 'This instruction, Offset 112, Size 32'],
                ['Message', 'B5MrvqsIcDUTKXV4jJryosGmPjceCGbvzbWhlSodJCI='],
            ]);
        });
    });

    // Faked from the fixture above: every self-reference bumped to an index the transaction lacks.
    it('should render the card even when the references resolve to nothing', async () => {
        const ed25519Ix = ed25519Instruction(
            fromHex(
                '01003000fffe1000fffe70002000fffe8f2ed8bcd09b724040a0fc59ce9b5ea78525b6054def83d68f3a3930aa76e5bd4c105e1989c4d276372c97a5efb79d89bcc78f094f155be1b369e62e8b7eb42f42b3341f6be3b5c6f13a176fd7ca32323bf759c547126117365dccdae56e180f07932bbeab087035132975788c9af2a2c1a63e371e0866efcdb5a1952a1d2422',
            ),
        );

        renderCard(ed25519Ix, transaction(ed25519Ix));

        await waitFor(() => {
            expect(readRows()).toEqual([
                ['Program', PROGRAM_ID.toBase58()],
                ['Signature #1', ''],
                ['Signature Reference', 'Instruction 65279, Offset 48'],
                ['Signature', 'Invalid reference'],
                ['Public Key Reference', 'Instruction 65279, Offset 16'],
                ['Public Key', 'Invalid reference'],
                ['Message Reference', 'Instruction 65279, Offset 112, Size 32'],
                ['Message', 'Invalid reference'],
            ]);
        });

        expect(screen.getByText(TITLE)).toBeInTheDocument();
    });

    // One instruction may verify several signatures, and only the heading tells the groups apart.
    it('should head each signature group with its position', async () => {
        const ed25519Ix = ed25519Instruction(new Uint8Array([2, 0, ...new Array(28).fill(0)]));

        renderCard(ed25519Ix, transaction(ed25519Ix));

        await waitFor(() => {
            expect(readRows().filter(([, value]) => value === '')).toEqual([
                ['Signature #1', ''],
                ['Signature #2', ''],
            ]);
        });
    });

    // A foreign program id proves the row reads the node rather than the ed25519 constant.
    it('should render the program row from the node', async () => {
        const foreignProgram = new PublicKey('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
        const ed25519Ix = ed25519Instruction(fromHex('0100'), foreignProgram);

        renderCard(ed25519Ix, transaction(ed25519Ix));

        await waitFor(() => {
            expect(readRows()).toEqual([['Program', foreignProgram.toBase58()]]);
        });
    });
});

function ed25519Instruction(data: Uint8Array, programId = PROGRAM_ID): TransactionInstruction {
    return new TransactionInstruction({ data: Buffer.from(data), keys: [], programId });
}

function fromHex(hex: string): Buffer {
    return Buffer.from(hex, 'hex');
}

function transaction(...instructions: Array<{ data: unknown }>): ParsedTransaction {
    return {
        message: {
            accountKeys: [],
            instructions,
            recentBlockhash: '11111111111111111111111111111111',
        },
        signatures: [],
    } as unknown as ParsedTransaction;
}

function renderCard(ix: TransactionInstruction, tx: ParsedTransaction) {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>
                            <Ed25519DetailsCard tx={tx} ix={ix} index={0} />
                        </TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}

/**
 * The card's own rows in render order, so the result pins row order as well as content.
 * Addresses are read from `data-address`, which carries the untruncated value the display
 * shortens; every other kind falls back to its rendered text.
 */
function readRows(): Row[] {
    const card = screen.getAllByRole('table')[0];
    return within(card)
        .getAllByRole('row')
        .filter(row => row.closest('table') === card)
        .map(row => {
            const cells = within(row).getAllByRole('cell');
            return [cells[0].textContent ?? '', readAddress(cells[1]) ?? cells[1]?.textContent ?? ''];
        });
}

function readAddress(cell: HTMLElement | undefined): string | undefined {
    return cell?.querySelector('[data-address]')?.getAttribute('data-address') ?? undefined;
}
