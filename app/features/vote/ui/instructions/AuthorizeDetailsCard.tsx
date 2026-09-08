import { address, defineInstructionCard, type InstructionFieldList } from '@entities/instruction-card';

import type { AuthorizeInfo } from '../../lib/instruction-types';
import { authorityTypeFields } from './authority-type-fields';

export const AuthorizeDetailsCard = defineInstructionCard<AuthorizeInfo>({
    fields,
    title: 'Vote: Authorize',
});

export const AuthorizeCheckedDetailsCard = defineInstructionCard<AuthorizeInfo>({
    fields,
    title: 'Vote: Authorize Checked',
});

/** Both variants carry the same payload, so one field list serves both cards. */
function fields(info: AuthorizeInfo): InstructionFieldList {
    return [
        address('Vote Account', info.voteAccount),
        address('Clock Sysvar', info.clockSysvar),
        address('Old Authority', info.authority),
        address('New Authority', info.newAuthority),
        ...authorityTypeFields(info.authorityType),
    ];
}
