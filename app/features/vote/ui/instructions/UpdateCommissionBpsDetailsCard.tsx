import { address, defineInstructionCard, text } from '@entities/instruction-card';

import type { UpdateCommissionBpsInfo } from '../../lib/instruction-types';

export const UpdateCommissionBpsDetailsCard = defineInstructionCard<UpdateCommissionBpsInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('Withdraw Authority', info.withdrawAuthority),
        text('Commission Kind', info.commissionKind),
        text('Commission', `${info.commissionBps / 100}%`),
    ],
    title: 'Vote: Update Commission Bps',
});
