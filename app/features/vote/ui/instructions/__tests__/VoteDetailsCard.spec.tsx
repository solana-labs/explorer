/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { gen } from '@__fixtures__/gen';
import { ParsedInstruction, ParsedTransaction, PublicKey, VOTE_PROGRAM_ID } from '@solana/web3.js';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: vi.fn(() => ({ push: vi.fn() })),
    useSearchParams: vi.fn(() => ({ get: vi.fn(), has: vi.fn(), toString: () => '' })),
}));

import { TxInstructionSurface } from '@entities/instruction-card';

import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import { TransactionsProvider } from '@/app/providers/transactions';

import { VoteDetailsCard } from '../VoteDetailsCard';

const VOTE_ACCOUNT = 'FMYmiwty1hMicTqzLqp4USvrjtqhsPhocquaUYMZsbPo';
const VOTE_AUTHORITY = 'Bdjmn2pTy6q7xZ5cHsCxZSCjdW2tUU86ZzwgjU9qsYKQ';
const CLOCK_SYSVAR = 'SysvarC1ock11111111111111111111111111111111';
// gen.blockhash is a deterministic 32-byte base58 string — the same shape as a vote/tower hash.
const HASH = gen.blockhash();

describe('@features/vote', () => {
    describe('instruction::VoteDetailsCard', () => {
        test('should render "towersync" instruction', async () => {
            const ix = voteParsedInstruction({
                info: {
                    towerSync: {
                        blockId: HASH,
                        hash: HASH,
                        lockouts: [
                            { confirmation_count: 31, slot: 414213970 },
                            { confirmation_count: 30, slot: 414213971 },
                        ],
                        root: 414213969,
                        timestamp: 1781015375,
                    },
                    voteAccount: VOTE_ACCOUNT,
                    voteAuthority: VOTE_AUTHORITY,
                },
                type: 'towersync',
            });

            renderCard(ix);

            // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
            await waitFor(() => {
                expect(screen.getByText(/Vote: Tower Sync/)).toBeInTheDocument();
            });
            expect(screen.getByText(/Root Slot/)).toBeInTheDocument();
            expect(screen.getByText(/414213970 \(31\)/)).toBeInTheDocument();
            expect(screen.queryByText(/Unknown Instruction/)).not.toBeInTheDocument();
        });

        test('should render "authorizeChecked" instruction with a BLS authority type', async () => {
            const ix = voteParsedInstruction({
                info: {
                    authority: VOTE_AUTHORITY,
                    authorityType: {
                        VoterWithBLS: {
                            bls_proof_of_possession: new Array(96).fill(7),
                            bls_pubkey: new Array(48).fill(3),
                        },
                    },
                    clockSysvar: CLOCK_SYSVAR,
                    newAuthority: VOTE_AUTHORITY,
                    voteAccount: VOTE_ACCOUNT,
                },
                type: 'authorizeChecked',
            });

            renderCard(ix);

            // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
            await waitFor(() => {
                expect(screen.getByText(/Vote: Authorize Checked/)).toBeInTheDocument();
            });
            expect(screen.getByText(/Voter \(BLS\)/)).toBeInTheDocument();
            expect(screen.getByText(/BLS Pubkey/)).toBeInTheDocument();
            expect(screen.queryByText(/Unknown Instruction/)).not.toBeInTheDocument();
        });

        test('should render "updateValidatorIdentity" instruction', async () => {
            const ix = voteParsedInstruction({
                info: {
                    newValidatorIdentity: VOTE_AUTHORITY,
                    voteAccount: VOTE_ACCOUNT,
                    withdrawAuthority: VOTE_AUTHORITY,
                },
                type: 'updateValidatorIdentity',
            });

            renderCard(ix);

            // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
            await waitFor(() => {
                expect(screen.getByText(/Vote: Update Validator Identity/)).toBeInTheDocument();
            });
            expect(screen.queryByText(/Unknown Instruction/)).not.toBeInTheDocument();
        });

        test('should fall back to UnknownDetailsCard for an unrecognized type', async () => {
            const ix = voteParsedInstruction({
                info: {},
                type: 'someFutureInstruction',
            });

            renderCard(ix);

            // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
            await waitFor(() => {
                expect(screen.getByText(/Unknown Instruction/)).toBeInTheDocument();
            });
        });
    });
});

function voteParsedInstruction(parsed: { info: object; type: string }): ParsedInstruction {
    return {
        parsed,
        program: 'vote',
        programId: VOTE_PROGRAM_ID,
    };
}

function renderCard(ix: ParsedInstruction) {
    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>
                            <VoteDetailsCard index={0} ix={ix} result={{ err: null }} tx={voteParsedTransaction(ix)} />
                        </TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}

function voteParsedTransaction(ix: ParsedInstruction): ParsedTransaction {
    return {
        message: {
            accountKeys: [
                { pubkey: new PublicKey(VOTE_AUTHORITY), signer: true, source: 'transaction', writable: true },
                { pubkey: new PublicKey(VOTE_ACCOUNT), signer: false, source: 'transaction', writable: true },
                { pubkey: new PublicKey(CLOCK_SYSVAR), signer: false, source: 'transaction', writable: false },
                { pubkey: VOTE_PROGRAM_ID, signer: false, source: 'transaction', writable: false },
            ],
            instructions: [ix],
            recentBlockhash: HASH,
        },
        signatures: ['3fEi7sku5kEgeZmLw9evxY5if9TsFyxpUNsi84J3s1bAeQmKSAhBypuxgprSs15MYBmvvTCnVwoN36rCaoqq6oHd'],
    };
}
