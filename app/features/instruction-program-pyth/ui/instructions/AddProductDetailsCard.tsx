import { address, defineInstructionCard } from '@entities/instruction-card';
import { type AddProductParams, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

export const AddProductDetailsCard = defineInstructionCard<AddProductParams>({
    fields: info => [
        address('Funding Account', info.fundingPubkey),
        address('Mapping Account', info.mappingPubkey),
        address('Product Account', info.productPubkey),
    ],
    title: `Pyth: ${PYTH_INSTRUCTIONS.AddProduct.name}`,
});
