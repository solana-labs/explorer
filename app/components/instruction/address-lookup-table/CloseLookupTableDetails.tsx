import { address, defineInstructionCard } from '@entities/instruction-card';

import { CloseLookupTableInfo } from './types';

export const CloseLookupTableDetailsCard = defineInstructionCard<CloseLookupTableInfo>({
    fields: info => [
        address('Lookup Table', info.lookupTableAccount),
        address('Lookup Table Authority', info.lookupTableAuthority),
    ],
    title: 'Address Lookup Table: Close Lookup Table',
});
