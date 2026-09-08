import { address, defineInstructionCard } from '@entities/instruction-card';

import { FreezeLookupTableInfo } from './types';

export const FreezeLookupTableDetailsCard = defineInstructionCard<FreezeLookupTableInfo>({
    fields: info => [
        address('Lookup Table', info.lookupTableAccount),
        address('Lookup Table Authority', info.lookupTableAuthority),
    ],
    title: 'Address Lookup Table: Freeze Lookup Table',
});
