import {
    nextjsParameters,
    withMockTransactions,
    withScrollAnchor,
    withTokenInfoBatch,
    withTxInstructionSurface,
} from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { VoteDetailsCard } from '../instructions/VoteDetailsCard';
import {
    BASE_SLOT,
    CLOCK_SYSVAR_ADDRESS,
    HASH,
    RENT_SYSVAR_ADDRESS,
    SLOT_HASHES_SYSVAR_ADDRESS,
    TIMESTAMP,
    VOTE_ACCOUNT_ADDRESS,
    VOTE_AUTHORITY_ADDRESS,
    voteParsedInstruction,
    voteParsedTransaction,
} from './fixtures';

const meta = {
    component: VoteDetailsCard,
    decorators: [withMockTransactions, withScrollAnchor, withTokenInfoBatch, withTxInstructionSurface],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Features/Vote/VoteDetailsCard',
} satisfies Meta<typeof VoteDetailsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOCKOUTS = [
    { confirmation_count: 31, slot: BASE_SLOT },
    { confirmation_count: 30, slot: BASE_SLOT + 1 },
];

export const Initialize: Story = {
    args: cardArgs({
        info: {
            authorizedVoter: VOTE_AUTHORITY_ADDRESS,
            authorizedWithdrawer: VOTE_AUTHORITY_ADDRESS,
            clockSysvar: CLOCK_SYSVAR_ADDRESS,
            commission: 5,
            node: VOTE_AUTHORITY_ADDRESS,
            rentSysvar: RENT_SYSVAR_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
        },
        type: 'initialize',
    }),
    play: expectTitle('Vote: Initialize'),
};

export const InitializeV2: Story = {
    args: cardArgs({
        info: {
            authorizedVoter: VOTE_AUTHORITY_ADDRESS,
            authorizedVoterBlsProofOfPossession: 'mOZcyrqpCckPeKVYksZsCInRO6MZc2uc93Hf2Oeb',
            authorizedVoterBlsPubkey: 'sz/sKhfNFcN7Kcszzomb1fONZjhMClKxVx/L3EHj',
            authorizedWithdrawer: VOTE_AUTHORITY_ADDRESS,
            blockRevenueCollector: VOTE_AUTHORITY_ADDRESS,
            blockRevenueCommissionBps: 10000,
            inflationRewardsCollector: VOTE_ACCOUNT_ADDRESS,
            inflationRewardsCommissionBps: 500,
            node: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
        },
        type: 'initializeV2',
    }),
    play: expectTitle('Vote: Initialize V2'),
};

export const Authorize: Story = {
    args: cardArgs({
        info: {
            authority: VOTE_AUTHORITY_ADDRESS,
            authorityType: 'Withdrawer',
            clockSysvar: CLOCK_SYSVAR_ADDRESS,
            newAuthority: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
        },
        type: 'authorize',
    }),
    play: expectTitle('Vote: Authorize'),
};

export const AuthorizeCheckedWithBls: Story = {
    args: cardArgs({
        info: {
            authority: VOTE_AUTHORITY_ADDRESS,
            authorityType: {
                VoterWithBLS: {
                    bls_proof_of_possession: new Array(96).fill(7),
                    bls_pubkey: new Array(48).fill(3),
                },
            },
            clockSysvar: CLOCK_SYSVAR_ADDRESS,
            newAuthority: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
        },
        type: 'authorizeChecked',
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Vote: Authorize Checked')).toBeInTheDocument();
        expect(canvas.getByText('Voter (BLS)')).toBeInTheDocument();
        expect(canvas.getByText('BLS Proof of Possession')).toBeInTheDocument();
    },
};

export const AuthorizeWithSeed: Story = {
    args: cardArgs({
        info: {
            authorityBaseKey: VOTE_AUTHORITY_ADDRESS,
            authorityOwner: VOTE_AUTHORITY_ADDRESS,
            authoritySeed: 'vote-authority-seed',
            authorityType: 'Voter',
            clockSysvar: CLOCK_SYSVAR_ADDRESS,
            newAuthority: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
        },
        type: 'authorizeWithSeed',
    }),
    play: expectTitle('Vote: Authorize With Seed'),
};

export const LegacyVote: Story = {
    args: cardArgs({
        info: {
            clockSysvar: CLOCK_SYSVAR_ADDRESS,
            slotHashesSysvar: SLOT_HASHES_SYSVAR_ADDRESS,
            vote: { hash: HASH, slots: [BASE_SLOT, BASE_SLOT + 1, BASE_SLOT + 2], timestamp: TIMESTAMP },
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            voteAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'vote',
    }),
    play: expectTitle('Vote: Vote'),
};

export const VoteSwitch: Story = {
    args: cardArgs({
        info: {
            clockSysvar: CLOCK_SYSVAR_ADDRESS,
            hash: HASH,
            slotHashesSysvar: SLOT_HASHES_SYSVAR_ADDRESS,
            vote: { hash: HASH, slots: [BASE_SLOT], timestamp: TIMESTAMP },
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            voteAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'voteSwitch',
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Vote: Vote Switch')).toBeInTheDocument();
        expect(canvas.getByText('Switch Proof Hash')).toBeInTheDocument();
    },
};

export const UpdateVoteState: Story = {
    args: cardArgs({
        info: {
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            voteAuthority: VOTE_AUTHORITY_ADDRESS,
            voteStateUpdate: { hash: HASH, lockouts: LOCKOUTS, root: BASE_SLOT - 1, timestamp: TIMESTAMP },
        },
        type: 'updatevotestate',
    }),
    play: expectTitle('Vote: Update Vote State'),
};

export const CompactUpdateVoteStateSwitch: Story = {
    args: cardArgs({
        info: {
            hash: HASH,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            voteAuthority: VOTE_AUTHORITY_ADDRESS,
            voteStateUpdate: { hash: HASH, lockouts: LOCKOUTS, root: null, timestamp: null },
        },
        type: 'compactupdatevotestateswitch',
    }),
    play: expectTitle('Vote: Compact Update Vote State Switch'),
};

export const TowerSync: Story = {
    args: cardArgs({
        info: {
            towerSync: { blockId: HASH, hash: HASH, lockouts: LOCKOUTS, root: BASE_SLOT - 1, timestamp: TIMESTAMP },
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            voteAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'towersync',
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Vote: Tower Sync')).toBeInTheDocument();
        expect(canvas.getByText('Block Id')).toBeInTheDocument();
        expect(canvas.getByText('Slots (Confirmation Count)')).toBeInTheDocument();
    },
};

export const Withdraw: Story = {
    args: cardArgs({
        info: {
            destination: VOTE_AUTHORITY_ADDRESS,
            lamports: 1_000_000_000,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            withdrawAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'withdraw',
    }),
    play: expectTitle('Vote: Withdraw'),
};

export const UpdateValidatorIdentity: Story = {
    args: cardArgs({
        info: {
            newValidatorIdentity: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            withdrawAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'updateValidatorIdentity',
    }),
    play: expectTitle('Vote: Update Validator Identity'),
};

export const UpdateCommission: Story = {
    args: cardArgs({
        info: {
            commission: 10,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            withdrawAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'updateCommission',
    }),
    play: expectTitle('Vote: Update Commission'),
};

export const UpdateCommissionBps: Story = {
    args: cardArgs({
        info: {
            commissionBps: 800,
            commissionKind: 'InflationRewards',
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            withdrawAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'updateCommissionBps',
    }),
    play: expectTitle('Vote: Update Commission Bps'),
};

export const UpdateCommissionCollector: Story = {
    args: cardArgs({
        info: {
            commissionKind: 'BlockRevenue',
            newCollector: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
            withdrawAuthority: VOTE_AUTHORITY_ADDRESS,
        },
        type: 'updateCommissionCollector',
    }),
    play: expectTitle('Vote: Update Commission Collector'),
};

export const DepositDelegatorRewards: Story = {
    args: cardArgs({
        info: {
            deposit: 500_000_000,
            source: VOTE_AUTHORITY_ADDRESS,
            voteAccount: VOTE_ACCOUNT_ADDRESS,
        },
        type: 'depositDelegatorRewards',
    }),
    play: expectTitle('Vote: Deposit Delegator Rewards'),
};

export const UnknownInstructionFallback: Story = {
    args: cardArgs({ info: {}, type: 'someFutureInstruction' }),
    play: expectTitle('Vote Program: Unknown Instruction'),
};

function cardArgs(parsed: { info: object; type: string }) {
    const ix = voteParsedInstruction(parsed);
    return { index: 0, ix, result: { err: null }, tx: voteParsedTransaction(ix) };
}

function expectTitle(title: string) {
    return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        expect(within(canvasElement).getByText(title)).toBeInTheDocument();
    };
}
