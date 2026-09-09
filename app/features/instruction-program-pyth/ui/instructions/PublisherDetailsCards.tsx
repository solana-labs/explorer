import { address, defineInstructionCard, type InstructionFieldList } from '@entities/instruction-card';
import { type BasePublisherOperationParams, PYTH_INSTRUCTIONS } from '@explorer/decoder-pyth';

// Add and Delete differ only in title.
const publisherFields = (info: BasePublisherOperationParams): InstructionFieldList => [
    address('Price Account', info.pricePubkey),
    address('Publisher', info.publisherPubkey),
];

export const AddPublisherDetailsCard = defineInstructionCard<BasePublisherOperationParams>({
    fields: publisherFields,
    title: `Pyth: ${PYTH_INSTRUCTIONS.AddPublisher.name}`,
});

export const DeletePublisherDetailsCard = defineInstructionCard<BasePublisherOperationParams>({
    fields: publisherFields,
    title: `Pyth: ${PYTH_INSTRUCTIONS.DeletePublisher.name}`,
});
