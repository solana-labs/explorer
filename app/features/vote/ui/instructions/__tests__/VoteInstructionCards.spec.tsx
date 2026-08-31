import { gen } from '@__fixtures__/gen';
import { TxInstructionSurface } from '@entities/instruction-card';
import {
    type ParsedInstruction,
    type ParsedTransaction,
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_SLOT_HASHES_PUBKEY,
    VOTE_PROGRAM_ID,
} from '@solana/web3.js';
import { render, screen, waitFor, within } from '@testing-library/react';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
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

import { VoteDetailsCard } from '../VoteDetailsCard';

const A = {
    base: gen.address(1),
    collector: gen.address(2),
    dest: gen.address(3),
    newAuthority: gen.address(4),
    node: gen.address(5),
    owner: gen.address(6),
    source: gen.address(7),
    voteAccount: gen.address(8),
    voteAuthority: gen.address(9),
} as const;

const SYSVAR = {
    clock: SYSVAR_CLOCK_PUBKEY.toBase58(),
    rent: SYSVAR_RENT_PUBKEY.toBase58(),
    slotHashes: SYSVAR_SLOT_HASHES_PUBKEY.toBase58(),
} as const;

const PROGRAM = VOTE_PROGRAM_ID.toBase58();

const HASH = gen.blockhash(1);
const BLOCK_ID = gen.blockhash(2);
const SWITCH_HASH = gen.blockhash(3);

/** A vote timestamp and the string the row must derive from it. */
const TS = 1_700_000_000;
const TS_TEXT = displayTimestampUtc(unixTimestampToMs(TS));

const BLS_PUBKEY = Buffer.from(new Array(48).fill(3)).toString('base64');
const BLS_POP = Buffer.from(new Array(96).fill(7)).toString('base64');

const LOCKOUTS = [
    { confirmation_count: 31, slot: 414_213_970 },
    { confirmation_count: 30, slot: 414_213_971 },
];
const LOCKOUTS_TEXT = '414213970 (31)\n414213971 (30)';

const SLOTS = [414_213_970, 414_213_971];
const SLOTS_TEXT = '414213970\n414213971';

const ROOT = 414_213_969;

const TOWER = { hash: HASH, lockouts: LOCKOUTS, root: ROOT, timestamp: TS };

/** Each row as `[label, value]`. An address row carries the untruncated address, not the shortened text. */
type Row = [string, string];

/** `name` labels the it.each case when the title alone does not say which fixture ran. */
const CASES: Array<{ info: object; name?: string; rows: Row[]; title: string; type: string }> = [
    {
        info: {
            authorizedVoter: A.base,
            authorizedWithdrawer: A.owner,
            clockSysvar: SYSVAR.clock,
            commission: 10,
            node: A.node,
            rentSysvar: SYSVAR.rent,
            voteAccount: A.voteAccount,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Rent Sysvar', SYSVAR.rent],
            ['Clock Sysvar', SYSVAR.clock],
            ['Node', A.node],
            ['Authorized Voter', A.base],
            ['Authorized Withdrawer', A.owner],
            ['Commission', '10%'],
        ],
        title: 'Vote: Initialize',
        type: 'initialize',
    },
    {
        info: {
            authorizedVoter: A.base,
            authorizedVoterBlsProofOfPossession: BLS_POP,
            authorizedVoterBlsPubkey: BLS_PUBKEY,
            authorizedWithdrawer: A.owner,
            blockRevenueCollector: A.dest,
            blockRevenueCommissionBps: 250,
            inflationRewardsCollector: A.collector,
            inflationRewardsCommissionBps: 750,
            node: A.node,
            voteAccount: A.voteAccount,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Node', A.node],
            ['Inflation Rewards Collector', A.collector],
            ['Block Revenue Collector', A.dest],
            ['Authorized Voter', A.base],
            ['Authorized Voter BLS Pubkey', BLS_PUBKEY],
            ['Authorized Voter BLS Proof of Possession', BLS_POP],
            ['Authorized Withdrawer', A.owner],
            ['Inflation Rewards Commission', '7.5%'],
            ['Block Revenue Commission', '2.5%'],
        ],
        title: 'Vote: Initialize V2',
        type: 'initializeV2',
    },
    {
        info: {
            authority: A.voteAuthority,
            authorityType: 'Voter',
            clockSysvar: SYSVAR.clock,
            newAuthority: A.newAuthority,
            voteAccount: A.voteAccount,
        },
        name: 'Authorize, unit-variant authority type',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Clock Sysvar', SYSVAR.clock],
            ['Old Authority', A.voteAuthority],
            ['New Authority', A.newAuthority],
            ['Authority Type', 'Voter'],
        ],
        title: 'Vote: Authorize',
        type: 'authorize',
    },
    {
        info: {
            authority: A.voteAuthority,
            authorityType: {
                VoterWithBLS: {
                    bls_proof_of_possession: new Array(96).fill(7),
                    bls_pubkey: new Array(48).fill(3),
                },
            },
            clockSysvar: SYSVAR.clock,
            newAuthority: A.newAuthority,
            voteAccount: A.voteAccount,
        },
        name: 'Authorize Checked, BLS authority type',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Clock Sysvar', SYSVAR.clock],
            ['Old Authority', A.voteAuthority],
            ['New Authority', A.newAuthority],
            ['Authority Type', 'Voter (BLS)'],
            ['BLS Pubkey', BLS_PUBKEY],
            ['BLS Proof of Possession', BLS_POP],
        ],
        title: 'Vote: Authorize Checked',
        type: 'authorizeChecked',
    },
    {
        info: {
            authorityBaseKey: A.base,
            authorityOwner: A.owner,
            authoritySeed: 'vote:0',
            authorityType: 'Withdrawer',
            clockSysvar: SYSVAR.clock,
            newAuthority: A.newAuthority,
            voteAccount: A.voteAccount,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Clock Sysvar', SYSVAR.clock],
            ['Authority Base Key', A.base],
            ['Authority Owner', A.owner],
            ['Authority Seed', 'vote:0'],
            ['New Authority', A.newAuthority],
            ['Authority Type', 'Withdrawer'],
        ],
        title: 'Vote: Authorize With Seed',
        type: 'authorizeWithSeed',
    },
    {
        info: {
            authorityBaseKey: A.base,
            authorityOwner: A.owner,
            authoritySeed: 'vote:0',
            authorityType: 'Withdrawer',
            clockSysvar: SYSVAR.clock,
            newAuthority: A.newAuthority,
            voteAccount: A.voteAccount,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Clock Sysvar', SYSVAR.clock],
            ['Authority Base Key', A.base],
            ['Authority Owner', A.owner],
            ['Authority Seed', 'vote:0'],
            ['New Authority', A.newAuthority],
            ['Authority Type', 'Withdrawer'],
        ],
        title: 'Vote: Authorize Checked With Seed',
        type: 'authorizeCheckedWithSeed',
    },
    {
        info: {
            clockSysvar: SYSVAR.clock,
            slotHashesSysvar: SYSVAR.slotHashes,
            vote: { hash: HASH, slots: SLOTS, timestamp: TS },
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
        },
        name: 'Vote, timestamp present and no switch proof',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Slot Hashes Sysvar', SYSVAR.slotHashes],
            ['Clock Sysvar', SYSVAR.clock],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Timestamp', TS_TEXT],
            ['Slots', SLOTS_TEXT],
        ],
        title: 'Vote: Vote',
        type: 'vote',
    },
    {
        info: {
            clockSysvar: SYSVAR.clock,
            hash: SWITCH_HASH,
            slotHashesSysvar: SYSVAR.slotHashes,
            vote: { hash: HASH, slots: SLOTS },
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
        },
        name: 'Vote Switch, switch proof and no timestamp',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Slot Hashes Sysvar', SYSVAR.slotHashes],
            ['Clock Sysvar', SYSVAR.clock],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Slots', SLOTS_TEXT],
            ['Switch Proof Hash', SWITCH_HASH],
        ],
        title: 'Vote: Vote Switch',
        type: 'voteSwitch',
    },
    {
        info: {
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
            voteStateUpdate: { hash: HASH, lockouts: LOCKOUTS, root: ROOT, timestamp: TS },
        },
        name: 'Update Vote State, root and timestamp present',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Root Slot', String(ROOT)],
            ['Timestamp', TS_TEXT],
            ['Slots (Confirmation Count)', LOCKOUTS_TEXT],
        ],
        title: 'Vote: Update Vote State',
        type: 'updatevotestate',
    },
    {
        info: {
            hash: SWITCH_HASH,
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
            voteStateUpdate: { hash: HASH, lockouts: LOCKOUTS },
        },
        name: 'Update Vote State Switch, root and timestamp omitted',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Slots (Confirmation Count)', LOCKOUTS_TEXT],
            ['Switch Proof Hash', SWITCH_HASH],
        ],
        title: 'Vote: Update Vote State Switch',
        type: 'updatevotestateswitch',
    },
    {
        info: {
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
            voteStateUpdate: { hash: HASH, lockouts: LOCKOUTS, root: ROOT, timestamp: TS },
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Root Slot', String(ROOT)],
            ['Timestamp', TS_TEXT],
            ['Slots (Confirmation Count)', LOCKOUTS_TEXT],
        ],
        title: 'Vote: Compact Update Vote State',
        type: 'compactupdatevotestate',
    },
    {
        info: {
            hash: SWITCH_HASH,
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
            voteStateUpdate: { hash: HASH, lockouts: LOCKOUTS, root: ROOT, timestamp: TS },
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Root Slot', String(ROOT)],
            ['Timestamp', TS_TEXT],
            ['Slots (Confirmation Count)', LOCKOUTS_TEXT],
            ['Switch Proof Hash', SWITCH_HASH],
        ],
        title: 'Vote: Compact Update Vote State Switch',
        type: 'compactupdatevotestateswitch',
    },
    {
        info: {
            towerSync: { ...TOWER, blockId: BLOCK_ID },
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
        },
        name: 'Tower Sync, block id present',
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Block Id', BLOCK_ID],
            ['Root Slot', String(ROOT)],
            ['Timestamp', TS_TEXT],
            ['Slots (Confirmation Count)', LOCKOUTS_TEXT],
        ],
        title: 'Vote: Tower Sync',
        type: 'towersync',
    },
    {
        info: {
            hash: SWITCH_HASH,
            towerSync: { ...TOWER, blockId: BLOCK_ID },
            voteAccount: A.voteAccount,
            voteAuthority: A.voteAuthority,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Vote Authority', A.voteAuthority],
            ['Vote Hash', HASH],
            ['Block Id', BLOCK_ID],
            ['Root Slot', String(ROOT)],
            ['Timestamp', TS_TEXT],
            ['Slots (Confirmation Count)', LOCKOUTS_TEXT],
            ['Switch Proof Hash', SWITCH_HASH],
        ],
        title: 'Vote: Tower Sync Switch',
        type: 'towersyncswitch',
    },
    {
        info: {
            destination: A.dest,
            lamports: 1_500_000_000,
            voteAccount: A.voteAccount,
            withdrawAuthority: A.owner,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['To Address', A.dest],
            ['Withdraw Authority', A.owner],
            ['Withdraw Amount (SOL)', '◎1.5'],
        ],
        title: 'Vote: Withdraw',
        type: 'withdraw',
    },
    {
        info: {
            newValidatorIdentity: A.node,
            voteAccount: A.voteAccount,
            withdrawAuthority: A.owner,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['New Validator Identity', A.node],
            ['Withdraw Authority', A.owner],
        ],
        title: 'Vote: Update Validator Identity',
        type: 'updateValidatorIdentity',
    },
    {
        info: { commission: 10, voteAccount: A.voteAccount, withdrawAuthority: A.owner },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Withdraw Authority', A.owner],
            ['Commission', '10%'],
        ],
        title: 'Vote: Update Commission',
        type: 'updateCommission',
    },
    {
        info: {
            commissionBps: 750,
            commissionKind: 'InflationRewards',
            voteAccount: A.voteAccount,
            withdrawAuthority: A.owner,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Withdraw Authority', A.owner],
            ['Commission Kind', 'InflationRewards'],
            ['Commission', '7.5%'],
        ],
        title: 'Vote: Update Commission Bps',
        type: 'updateCommissionBps',
    },
    {
        info: {
            commissionKind: 'BlockRevenue',
            newCollector: A.collector,
            voteAccount: A.voteAccount,
            withdrawAuthority: A.owner,
        },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['New Collector', A.collector],
            ['Withdraw Authority', A.owner],
            ['Commission Kind', 'BlockRevenue'],
        ],
        title: 'Vote: Update Commission Collector',
        type: 'updateCommissionCollector',
    },
    {
        info: { deposit: 250_000_000, source: A.source, voteAccount: A.voteAccount },
        rows: [
            ['Program', PROGRAM],
            ['Vote Account', A.voteAccount],
            ['Source', A.source],
            ['Deposit Amount (SOL)', '◎0.25'],
        ],
        title: 'Vote: Deposit Delegator Rewards',
        type: 'depositDelegatorRewards',
    },
];

describe('vote::instruction cards', () => {
    it.each(CASES)('should render $title ($name)', async ({ info, rows, title, type }) => {
        renderCard({ info, type });

        // waitFor's act() boundary absorbs ClusterProvider's post-mount dispatch
        await waitFor(() => {
            expect(screen.getByText(title)).toBeInTheDocument();
        });
        expect(readRows()).toEqual(rows);
    });

    // A foreign program id proves the row reads the instruction rather than a vote-program constant.
    it('should render the program row from the instruction', async () => {
        renderCard(
            {
                info: { commission: 10, voteAccount: A.voteAccount, withdrawAuthority: A.owner },
                type: 'updateCommission',
            },
            new PublicKey(A.node),
        );

        await waitFor(() => {
            expect(readRows()[0]).toEqual(['Program', A.node]);
        });
    });

    it('should render the authority seed as copyable code', async () => {
        renderCard({
            info: {
                authorityBaseKey: A.base,
                authorityOwner: A.owner,
                authoritySeed: 'vote:0',
                authorityType: 'Withdrawer',
                clockSysvar: SYSVAR.clock,
                newAuthority: A.newAuthority,
                voteAccount: A.voteAccount,
            },
            type: 'authorizeWithSeed',
        });

        await waitFor(() => {
            expect(screen.getByText('vote:0').tagName).toBe('CODE');
        });
    });

    // Line breaks survive only inside a <pre>, and `getByText` normalizes them away.
    it('should draw the tower payload as preformatted rows and the timestamp in UTC', async () => {
        renderCard({
            info: {
                towerSync: { ...TOWER, blockId: BLOCK_ID },
                voteAccount: A.voteAccount,
                voteAuthority: A.voteAuthority,
            },
            type: 'towersync',
        });

        await waitFor(() => {
            expect(readCell('Timestamp')).toBe(TS_TEXT);
        });
        expect(findCell('Timestamp')).toHaveClass('font-mono');
        expect(findPre('Slots (Confirmation Count)')?.textContent).toBe(LOCKOUTS_TEXT);
        expect(findPre('Root Slot')?.textContent).toBe(String(ROOT));
        expect(findPre('Vote Hash')?.textContent).toBe(HASH);
    });

    it('should fall back to UnknownDetailsCard for an unrecognized type', async () => {
        renderCard({ info: {}, type: 'someFutureInstruction' });

        await waitFor(() => {
            expect(screen.getByText('Unknown Instruction', { exact: false })).toBeInTheDocument();
        });
    });
});

function renderCard(parsed: { info: object; type: string }, programId: PublicKey = VOTE_PROGRAM_ID) {
    const ix = { parsed, program: 'vote', programId } as unknown as ParsedInstruction;

    return render(
        <ScrollAnchorProvider>
            <ClusterProvider>
                <TransactionsProvider>
                    <AccountsProvider>
                        <TxInstructionSurface result={{ err: null }}>
                            <VoteDetailsCard
                                index={0}
                                ix={ix}
                                result={{ err: null }}
                                tx={{ signatures: ['sig'] } as ParsedTransaction}
                            />
                        </TxInstructionSurface>
                    </AccountsProvider>
                </TransactionsProvider>
            </ClusterProvider>
        </ScrollAnchorProvider>,
    );
}

/**
 * In render order, so the result pins row order as well as content. Addresses are read
 * from `data-address`, which carries the untruncated value the display shortens; every
 * other kind falls back to its rendered text, so a wrong value fails rather than reading
 * as an empty cell.
 */
function readRows(): Row[] {
    return screen.getAllByRole('row').map(row => {
        const cells = within(row).getAllByRole('cell');
        // eslint-disable-next-line testing-library/no-node-access -- an address has no role to query by
        const address = cells[1]?.querySelector('[data-address]')?.getAttribute('data-address');
        return [cells[0].textContent ?? '', address ?? cells[1]?.textContent ?? ''];
    });
}

function findCell(label: string): HTMLElement | undefined {
    const row = screen.getAllByRole('row').find(r => within(r).getAllByRole('cell')[0]?.textContent === label);
    return row && within(row).getAllByRole('cell')[1];
}

function readCell(label: string): string {
    return findCell(label)?.textContent ?? '';
}

function findPre(label: string): Element | undefined {
    return findCell(label)?.querySelector('pre') ?? undefined;
}
