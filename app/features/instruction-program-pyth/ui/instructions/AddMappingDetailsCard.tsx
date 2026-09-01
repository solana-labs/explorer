import { address, defineInstructionCard } from '@entities/instruction-card';
import { type AddMappingParams, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

export const AddMappingDetailsCard = defineInstructionCard<AddMappingParams>({
    fields: info => [
        address('Funding Account', info.fundingPubkey),
        address('Mapping Account', info.mappingPubkey),
        address('Next Mapping Account', info.nextMappingPubkey),
    ],
    title: `Pyth: ${PYTH_INSTRUCTIONS.AddMapping.name}`,
});
