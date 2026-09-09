import { Copyable } from '@components/common/Copyable';
import { address, custom, defineInstructionCard } from '@entities/instruction-card';
import { PYTH_INSTRUCTIONS, type UpdateProductParams } from '@explorer/decoder-pyth';

export const UpdateProductDetailsCard = defineInstructionCard<UpdateProductParams>({
    fields: info => [
        address('Funding Account', info.fundingPubkey),
        address('Product Account', info.productPubkey),
        custom('Attributes (JSON)', <AttributesJson attributes={info.attributes} />),
    ],
    title: `Pyth: ${PYTH_INSTRUCTIONS.UpdateProduct.name}`,
});

/** Two copies, one per breakpoint, because the alignment cannot be expressed on a single node. */
function AttributesJson({ attributes }: { attributes: Map<string, string> }) {
    const json = JSON.stringify(Object.fromEntries(attributes), undefined, 2);
    const content = (
        <Copyable text={json}>
            <pre className="mb-0 inline-block text-left">{json}</pre>
        </Copyable>
    );

    return (
        <>
            <div className="hidden items-center justify-end lg:flex">{content}</div>
            <div className="flex items-center lg:hidden">{content}</div>
        </>
    );
}
