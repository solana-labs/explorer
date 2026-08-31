import { address, defineInstructionCard, text } from '@entities/instruction-card';

import type { UpdateCommissionInfo } from '../../lib/instruction-types';

export const UpdateCommissionDetailsCard = defineInstructionCard<UpdateCommissionInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('Withdraw Authority', info.withdrawAuthority),
        text('Commission', `${info.commission}%`),
    ],
    title: 'Vote: Update Commission',
});
