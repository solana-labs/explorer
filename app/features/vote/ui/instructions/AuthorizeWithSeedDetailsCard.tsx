import { address, defineInstructionCard, type InstructionFieldList, seed } from '@entities/instruction-card';

import type { AuthorizeWithSeedInfo } from '../../lib/instruction-types';
import { authorityTypeFields } from './authority-type-fields';

export const AuthorizeWithSeedDetailsCard = defineInstructionCard<AuthorizeWithSeedInfo>({
    fields,
    title: 'Vote: Authorize With Seed',
});

export const AuthorizeCheckedWithSeedDetailsCard = defineInstructionCard<AuthorizeWithSeedInfo>({
    fields,
    title: 'Vote: Authorize Checked With Seed',
});

/** Both variants carry the same payload, so one field list serves both cards. */
function fields(info: AuthorizeWithSeedInfo): InstructionFieldList {
    return [
        address('Vote Account', info.voteAccount),
        address('Clock Sysvar', info.clockSysvar),
        address('Authority Base Key', info.authorityBaseKey),
        address('Authority Owner', info.authorityOwner),
        seed('Authority Seed', info.authoritySeed),
        address('New Authority', info.newAuthority),
        ...authorityTypeFields(info.authorityType),
    ];
}
