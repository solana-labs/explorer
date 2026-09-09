import { address, defineInstructionCard, type InstructionFieldList, text } from '@entities/instruction-card';
import { PYTH_INSTRUCTIONS, TradingStatus, type UpdatePriceParams } from '@explorer/decoder-pyth';

// Two distinct instructions carrying the same payload; only the title tells them apart.
const priceUpdateFields = (info: UpdatePriceParams): InstructionFieldList => [
    address('Publisher', info.publisherPubkey),
    address('Price Account', info.pricePubkey),
    text('Status', TradingStatus[info.status]),
    text('Price', info.price),
    text('Conf', info.conf),
    text('Publish Slot', info.publishSlot),
];

export const UpdatePriceDetailsCard = defineInstructionCard<UpdatePriceParams>({
    fields: priceUpdateFields,
    title: `Pyth: ${PYTH_INSTRUCTIONS.UpdatePrice.name}`,
});

export const UpdatePriceNoFailOnErrorDetailsCard = defineInstructionCard<UpdatePriceParams>({
    fields: priceUpdateFields,
    title: `Pyth: ${PYTH_INSTRUCTIONS.UpdatePriceNoFailOnError.name}`,
});
