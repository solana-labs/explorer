import { address, defineInstructionCard, sol } from '@entities/instruction-card';

import type { DepositDelegatorRewardsInfo } from '../../lib/instruction-types';

export const DepositDelegatorRewardsDetailsCard = defineInstructionCard<DepositDelegatorRewardsInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('Source', info.source),
        sol('Deposit Amount (SOL)', info.deposit),
    ],
    title: 'Vote: Deposit Delegator Rewards',
});
