import { address, defineInstructionCard, text } from '@entities/instruction-card';
import { type InitPriceParams, PriceType, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

export const InitPriceDetailsCard = defineInstructionCard<InitPriceParams>({
    fields: info => [
        address('Funding Account', info.fundingPubkey),
        address('Price Account', info.pricePubkey),
        text('Exponent', info.exponent),
        text('Price Type', PriceType[info.priceType]),
    ],
    title: `Pyth: ${PYTH_INSTRUCTIONS.InitPrice.name}`,
});
