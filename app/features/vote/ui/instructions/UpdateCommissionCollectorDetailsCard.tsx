import { address, defineInstructionCard, text } from '@entities/instruction-card';

import type { UpdateCommissionCollectorInfo } from '../../lib/instruction-types';

export const UpdateCommissionCollectorDetailsCard = defineInstructionCard<UpdateCommissionCollectorInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('New Collector', info.newCollector),
        address('Withdraw Authority', info.withdrawAuthority),
        text('Commission Kind', info.commissionKind),
    ],
    title: 'Vote: Update Commission Collector',
});
