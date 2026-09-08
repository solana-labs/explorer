import { address, defineInstructionCard } from '@entities/instruction-card';

import { DeactivateLookupTableInfo } from './types';

export const DeactivateLookupTableDetailsCard = defineInstructionCard<DeactivateLookupTableInfo>({
    fields: info => [
        address('Lookup Table', info.lookupTableAccount),
        address('Lookup Table Authority', info.lookupTableAuthority),
    ],
    title: 'Address Lookup Table: Deactivate Lookup Table',
});
