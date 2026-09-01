import { address, defineInstructionCard, text } from '@entities/instruction-card';
import { PYTH_INSTRUCTIONS, type SetMinPublishersParams } from '@explorer/decoder-pyth';

export const SetMinPublishersDetailsCard = defineInstructionCard<SetMinPublishersParams>({
    fields: info => [
        address('Funding Account', info.fundingPubkey),
        address('Price Account', info.pricePubkey),
        text('Min Publishers', info.minPublishers),
    ],
    title: `Pyth: ${PYTH_INSTRUCTIONS.SetMinPublishers.name}`,
});
