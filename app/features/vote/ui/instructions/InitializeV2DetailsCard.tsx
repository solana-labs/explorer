import { address, defineInstructionCard, preformatted, text } from '@entities/instruction-card';

import type { InitializeV2Info } from '../../lib/instruction-types';

export const InitializeV2DetailsCard = defineInstructionCard<InitializeV2Info>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('Node', info.node),
        address('Inflation Rewards Collector', info.inflationRewardsCollector),
        address('Block Revenue Collector', info.blockRevenueCollector),
        address('Authorized Voter', info.authorizedVoter),
        preformatted('Authorized Voter BLS Pubkey', info.authorizedVoterBlsPubkey),
        preformatted('Authorized Voter BLS Proof of Possession', info.authorizedVoterBlsProofOfPossession),
        address('Authorized Withdrawer', info.authorizedWithdrawer),
        text('Inflation Rewards Commission', `${info.inflationRewardsCommissionBps / 100}%`),
        text('Block Revenue Commission', `${info.blockRevenueCommissionBps / 100}%`),
    ],
    title: 'Vote: Initialize V2',
});
