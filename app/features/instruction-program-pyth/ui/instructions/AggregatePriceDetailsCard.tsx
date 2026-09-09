import { address, defineInstructionCard } from '@entities/instruction-card';
import { type AggregatePriceParams, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

export const AggregatePriceDetailsCard = defineInstructionCard<AggregatePriceParams>({
    fields: info => [address('Funding Account', info.fundingPubkey), address('Price Account', info.pricePubkey)],
    title: `Pyth: ${PYTH_INSTRUCTIONS.AggregatePrice.name}`,
});
