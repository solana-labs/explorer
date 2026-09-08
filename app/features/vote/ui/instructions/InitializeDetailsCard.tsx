import { address, defineInstructionCard, text } from '@entities/instruction-card';

import type { InitializeInfo } from '../../lib/instruction-types';

export const InitializeDetailsCard = defineInstructionCard<InitializeInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('Rent Sysvar', info.rentSysvar),
        address('Clock Sysvar', info.clockSysvar),
        address('Node', info.node),
        address('Authorized Voter', info.authorizedVoter),
        address('Authorized Withdrawer', info.authorizedWithdrawer),
        text('Commission', `${info.commission}%`),
    ],
    title: 'Vote: Initialize',
});
