import { address, defineInstructionCard, type InstructionFieldList, preformatted } from '@entities/instruction-card';

import type { TowerSyncInfo } from '../../lib/instruction-types';
import { voteStateFields } from './vote-state-fields';

export const TowerSyncDetailsCard = defineInstructionCard<TowerSyncInfo>({
    fields,
    title: 'Vote: Tower Sync',
});

export const TowerSyncSwitchDetailsCard = defineInstructionCard<TowerSyncInfo>({
    fields,
    title: 'Vote: Tower Sync Switch',
});

/** Only the switch variant carries a top-level hash, so one field list serves both cards. */
function fields(info: TowerSyncInfo): InstructionFieldList {
    return [
        address('Vote Account', info.voteAccount),
        address('Vote Authority', info.voteAuthority),
        ...voteStateFields(info.towerSync),
        info.hash !== undefined && preformatted('Switch Proof Hash', info.hash),
    ];
}
