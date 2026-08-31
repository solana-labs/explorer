import {
    address,
    defineInstructionCard,
    type InstructionFieldList,
    preformatted,
    timestamp,
} from '@entities/instruction-card';

import type { VoteInfo } from '../../lib/instruction-types';

// "vote" and "voteSwitch" — the pre-TowerSync vote instructions, deprecated on chain
// but still present in historical transactions.
export const LegacyVoteDetailsCard = defineInstructionCard<VoteInfo>({
    fields,
    title: 'Vote: Vote',
});

export const LegacyVoteSwitchDetailsCard = defineInstructionCard<VoteInfo>({
    fields,
    title: 'Vote: Vote Switch',
});

/** Only the switch variant carries a top-level hash, so one field list serves both cards. */
function fields(info: VoteInfo): InstructionFieldList {
    return [
        address('Vote Account', info.voteAccount),
        address('Slot Hashes Sysvar', info.slotHashesSysvar),
        address('Clock Sysvar', info.clockSysvar),
        address('Vote Authority', info.voteAuthority),
        preformatted('Vote Hash', info.vote.hash),
        info.vote.timestamp ? timestamp('Timestamp', info.vote.timestamp) : undefined,
        preformatted('Slots', info.vote.slots),
        info.hash !== undefined && preformatted('Switch Proof Hash', info.hash),
    ];
}
