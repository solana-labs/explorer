import { address, defineInstructionCard, text } from '@entities/instruction-card';
import { type AddPriceParams, PriceType, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

export const AddPriceDetailsCard = defineInstructionCard<AddPriceParams>({
    fields: info => [
        address('Funding Account', info.fundingPubkey),
        address('Product Account', info.productPubkey),
        address('Price Account', info.pricePubkey),
        text('Exponent', info.exponent),
        text('Price Type', PriceType[info.priceType]),
    ],
    title: `Pyth: ${PYTH_INSTRUCTIONS.AddPrice.name}`,
});
