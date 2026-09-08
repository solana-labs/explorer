import { address, defineInstructionCard, sol } from '@entities/instruction-card';

import type { WithdrawInfo } from '../../lib/instruction-types';

export const WithdrawDetailsCard = defineInstructionCard<WithdrawInfo>({
    fields: info => [
        address('Vote Account', info.voteAccount),
        address('To Address', info.destination),
        address('Withdraw Authority', info.withdrawAuthority),
        sol('Withdraw Amount (SOL)', info.lamports),
    ],
    title: 'Vote: Withdraw',
});
