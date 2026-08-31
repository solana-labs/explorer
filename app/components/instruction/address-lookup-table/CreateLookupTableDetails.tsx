import { Slot } from '@components/common/Slot';
import { address, custom, defineInstructionCard, text } from '@entities/instruction-card';

import { CreateLookupTableInfo } from './types';

export const CreateLookupTableDetailsCard = defineInstructionCard<CreateLookupTableInfo>({
    fields: info => [
        address('Lookup Table', info.lookupTableAccount),
        address('Lookup Table Authority', info.lookupTableAuthority),
        address('Payer Account', info.payerAccount),
        custom('Recent Slot', <Slot slot={info.recentSlot} link />),
        text('Bump Seed', info.bumpSeed),
    ],
    title: 'Address Lookup Table: Create Lookup Table',
});
