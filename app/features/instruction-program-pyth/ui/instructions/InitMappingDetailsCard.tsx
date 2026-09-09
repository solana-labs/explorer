import { address, defineInstructionCard } from '@entities/instruction-card';
import { type InitMappingParams, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

export const InitMappingDetailsCard = defineInstructionCard<InitMappingParams>({
    fields: info => [address('Funding Account', info.fundingPubkey), address('Mapping Account', info.mappingPubkey)],
    title: `Pyth: ${PYTH_INSTRUCTIONS.InitMapping.name}`,
});
