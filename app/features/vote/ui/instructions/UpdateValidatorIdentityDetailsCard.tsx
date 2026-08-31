import { address, defineInstructionCard } from '@entities/instruction-card';

import type { UpdateValidatorIdentityInfo } from '../../lib/instruction-types';

export const UpdateValidatorIdentityDetailsCard = defineInstructionCard<UpdateValidatorIdentityInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('New Validator Identity', info.newValidatorIdentity),
        address('Withdraw Authority', info.withdrawAuthority),
    ],
    title: 'Vote: Update Validator Identity',
});
