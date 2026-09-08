import { address, defineInstructionCard, type InstructionFieldList, preformatted } from '@entities/instruction-card';

import type { UpdateVoteStateInfo } from '../../lib/instruction-types';
import { voteStateFields } from './vote-state-fields';

export const UpdateVoteStateDetailsCard = defineInstructionCard<UpdateVoteStateInfo>({
    fields,
    title: 'Vote: Update Vote State',
});

export const UpdateVoteStateSwitchDetailsCard = defineInstructionCard<UpdateVoteStateInfo>({
    fields,
    title: 'Vote: Update Vote State Switch',
});

export const CompactUpdateVoteStateDetailsCard = defineInstructionCard<UpdateVoteStateInfo>({
    fields,
    title: 'Vote: Compact Update Vote State',
});

export const CompactUpdateVoteStateSwitchDetailsCard = defineInstructionCard<UpdateVoteStateInfo>({
    fields,
    title: 'Vote: Compact Update Vote State Switch',
});

/** The compact encoding decodes to the same payload, so one field list serves all four cards. */
function fields(info: UpdateVoteStateInfo): InstructionFieldList {
    return [
        address('Vote Account', info.voteAccount),
        address('Vote Authority', info.voteAuthority),
        ...voteStateFields(info.voteStateUpdate),
        info.hash !== undefined && preformatted('Switch Proof Hash', info.hash),
    ];
}
