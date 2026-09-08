import { UnknownDetailsCard } from '@components/instruction/UnknownDetailsCard';
import type { InstructionNode } from '@entities/instruction-card';
import type { ParsedInstruction, ParsedTransaction, SignatureResult } from '@solana/web3.js';
import { ParsedInfo } from '@validators/index';
import { create } from 'superstruct';

import { Logger } from '@/app/shared/lib/logger';

import {
    AuthorizeInfo,
    AuthorizeWithSeedInfo,
    DepositDelegatorRewardsInfo,
    InitializeInfo,
    InitializeV2Info,
    TowerSyncInfo,
    UpdateCommissionBpsInfo,
    UpdateCommissionCollectorInfo,
    UpdateCommissionInfo,
    UpdateValidatorIdentityInfo,
    UpdateVoteStateInfo,
    VoteInfo,
    WithdrawInfo,
} from '../../lib/instruction-types';
import { AuthorizeCheckedDetailsCard, AuthorizeDetailsCard } from './AuthorizeDetailsCard';
import { AuthorizeCheckedWithSeedDetailsCard, AuthorizeWithSeedDetailsCard } from './AuthorizeWithSeedDetailsCard';
import { DepositDelegatorRewardsDetailsCard } from './DepositDelegatorRewardsDetailsCard';
import { InitializeDetailsCard } from './InitializeDetailsCard';
import { InitializeV2DetailsCard } from './InitializeV2DetailsCard';
import { LegacyVoteDetailsCard, LegacyVoteSwitchDetailsCard } from './LegacyVoteDetailsCard';
import { TowerSyncDetailsCard, TowerSyncSwitchDetailsCard } from './TowerSyncDetailsCard';
import { UpdateCommissionBpsDetailsCard } from './UpdateCommissionBpsDetailsCard';
import { UpdateCommissionCollectorDetailsCard } from './UpdateCommissionCollectorDetailsCard';
import { UpdateCommissionDetailsCard } from './UpdateCommissionDetailsCard';
import { UpdateValidatorIdentityDetailsCard } from './UpdateValidatorIdentityDetailsCard';
import {
    CompactUpdateVoteStateDetailsCard,
    CompactUpdateVoteStateSwitchDetailsCard,
    UpdateVoteStateDetailsCard,
    UpdateVoteStateSwitchDetailsCard,
} from './UpdateVoteStateDetailsCard';
import { WithdrawDetailsCard } from './WithdrawDetailsCard';

type DetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    result: SignatureResult;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function VoteDetailsCard(props: DetailsProps) {
    const node: InstructionNode = {
        childIndex: props.childIndex,
        index: props.index,
        innerCards: props.innerCards,
        ix: props.ix,
        programId: props.ix.programId,
    };

    // TODO: Replace this try/catch + Logger with a React error boundary one level up
    // (see the matching note in StakeDetailsCard).
    try {
        const parsed = create(props.ix.parsed, ParsedInfo);

        switch (parsed.type) {
            case 'initialize': {
                const info = create(parsed.info, InitializeInfo);
                return <InitializeDetailsCard info={info} node={node} />;
            }
            case 'initializeV2': {
                const info = create(parsed.info, InitializeV2Info);
                return <InitializeV2DetailsCard info={info} node={node} />;
            }
            case 'authorize': {
                const info = create(parsed.info, AuthorizeInfo);
                return <AuthorizeDetailsCard info={info} node={node} />;
            }
            case 'authorizeChecked': {
                const info = create(parsed.info, AuthorizeInfo);
                return <AuthorizeCheckedDetailsCard info={info} node={node} />;
            }
            case 'authorizeWithSeed': {
                const info = create(parsed.info, AuthorizeWithSeedInfo);
                return <AuthorizeWithSeedDetailsCard info={info} node={node} />;
            }
            case 'authorizeCheckedWithSeed': {
                const info = create(parsed.info, AuthorizeWithSeedInfo);
                return <AuthorizeCheckedWithSeedDetailsCard info={info} node={node} />;
            }
            case 'vote': {
                const info = create(parsed.info, VoteInfo);
                return <LegacyVoteDetailsCard info={info} node={node} />;
            }
            case 'voteSwitch': {
                const info = create(parsed.info, VoteInfo);
                return <LegacyVoteSwitchDetailsCard info={info} node={node} />;
            }
            case 'updatevotestate': {
                const info = create(parsed.info, UpdateVoteStateInfo);
                return <UpdateVoteStateDetailsCard info={info} node={node} />;
            }
            case 'updatevotestateswitch': {
                const info = create(parsed.info, UpdateVoteStateInfo);
                return <UpdateVoteStateSwitchDetailsCard info={info} node={node} />;
            }
            case 'compactupdatevotestate': {
                const info = create(parsed.info, UpdateVoteStateInfo);
                return <CompactUpdateVoteStateDetailsCard info={info} node={node} />;
            }
            case 'compactupdatevotestateswitch': {
                const info = create(parsed.info, UpdateVoteStateInfo);
                return <CompactUpdateVoteStateSwitchDetailsCard info={info} node={node} />;
            }
            case 'towersync': {
                const info = create(parsed.info, TowerSyncInfo);
                return <TowerSyncDetailsCard info={info} node={node} />;
            }
            case 'towersyncswitch': {
                const info = create(parsed.info, TowerSyncInfo);
                return <TowerSyncSwitchDetailsCard info={info} node={node} />;
            }
            case 'withdraw': {
                const info = create(parsed.info, WithdrawInfo);
                return <WithdrawDetailsCard info={info} node={node} />;
            }
            case 'updateValidatorIdentity': {
                const info = create(parsed.info, UpdateValidatorIdentityInfo);
                return <UpdateValidatorIdentityDetailsCard info={info} node={node} />;
            }
            case 'updateCommission': {
                const info = create(parsed.info, UpdateCommissionInfo);
                return <UpdateCommissionDetailsCard info={info} node={node} />;
            }
            case 'updateCommissionBps': {
                const info = create(parsed.info, UpdateCommissionBpsInfo);
                return <UpdateCommissionBpsDetailsCard info={info} node={node} />;
            }
            case 'updateCommissionCollector': {
                const info = create(parsed.info, UpdateCommissionCollectorInfo);
                return <UpdateCommissionCollectorDetailsCard info={info} node={node} />;
            }
            case 'depositDelegatorRewards': {
                const info = create(parsed.info, DepositDelegatorRewardsInfo);
                return <DepositDelegatorRewardsDetailsCard info={info} node={node} />;
            }
            default:
                return <UnknownDetailsCard {...props} />;
        }
    } catch (error) {
        Logger.error(error, {
            signature: props.tx.signatures[0],
        });
        return <UnknownDetailsCard {...props} />;
    }
}
