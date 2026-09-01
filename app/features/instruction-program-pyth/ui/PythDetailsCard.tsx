import { InstructionCardView, type InstructionNode } from '@entities/instruction-card';
import {
    decodeAddMapping,
    decodeAddPrice,
    decodeAddProduct,
    decodeAddPublisher,
    decodeAggregatePrice,
    decodeDeletePublisher,
    decodeInitMapping,
    decodeInitPrice,
    decodeSetMinPublishers,
    decodeUpdatePrice,
    decodeUpdatePriceNoFailOnError,
    decodeUpdateProduct,
    parsePythInstructionType,
    PYTH_INSTRUCTIONS,
} from '@explorer/decoder-pyth';
import type { TransactionInstruction } from '@solana/web3.js';

import { Logger } from '@/app/shared/lib/logger';

import { AddMappingDetailsCard } from './instructions/AddMappingDetailsCard';
import { AddPriceDetailsCard } from './instructions/AddPriceDetailsCard';
import { AddProductDetailsCard } from './instructions/AddProductDetailsCard';
import { AggregatePriceDetailsCard } from './instructions/AggregatePriceDetailsCard';
import { InitMappingDetailsCard } from './instructions/InitMappingDetailsCard';
import { InitPriceDetailsCard } from './instructions/InitPriceDetailsCard';
import { AddPublisherDetailsCard, DeletePublisherDetailsCard } from './instructions/PublisherDetailsCards';
import { SetMinPublishersDetailsCard } from './instructions/SetMinPublishersDetailsCard';
import { UpdatePriceDetailsCard, UpdatePriceNoFailOnErrorDetailsCard } from './instructions/UpdatePriceDetailsCards';
import { UpdateProductDetailsCard } from './instructions/UpdateProductDetailsCard';

type PythDetailsCardProps = {
    ix: TransactionInstruction;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
    signature: string;
};

export function PythDetailsCard({ ix, index, innerCards, childIndex, signature }: PythDetailsCardProps) {
    const node: InstructionNode = { childIndex, index, innerCards, ix, programId: ix.programId };

    try {
        const type = parsePythInstructionType(ix);
        switch (type) {
            case 'InitMapping':
                return <InitMappingDetailsCard info={decodeInitMapping(ix)} node={node} />;
            case 'AddMapping':
                return <AddMappingDetailsCard info={decodeAddMapping(ix)} node={node} />;
            case 'AddProduct':
                return <AddProductDetailsCard info={decodeAddProduct(ix)} node={node} />;
            case 'UpdateProduct':
                return <UpdateProductDetailsCard info={decodeUpdateProduct(ix)} node={node} />;
            case 'AddPrice':
                return <AddPriceDetailsCard info={decodeAddPrice(ix)} node={node} />;
            case 'AddPublisher':
                return <AddPublisherDetailsCard info={decodeAddPublisher(ix)} node={node} />;
            case 'DeletePublisher':
                return <DeletePublisherDetailsCard info={decodeDeletePublisher(ix)} node={node} />;
            case 'UpdatePrice':
                return <UpdatePriceDetailsCard info={decodeUpdatePrice(ix)} node={node} />;
            case 'UpdatePriceNoFailOnError':
                return <UpdatePriceNoFailOnErrorDetailsCard info={decodeUpdatePriceNoFailOnError(ix)} node={node} />;
            case 'AggregatePrice':
                return <AggregatePriceDetailsCard info={decodeAggregatePrice(ix)} node={node} />;
            case 'InitPrice':
                return <InitPriceDetailsCard info={decodeInitPrice(ix)} node={node} />;
            case 'SetMinPublishers':
                return <SetMinPublishersDetailsCard info={decodeSetMinPublishers(ix)} node={node} />;
            // The oracle's two test instructions carry no payload, so there is nothing to tabulate.
            case 'InitTest':
            case 'UpdateTest':
                return <RawOnlyPythCard node={node} title={`Pyth: ${PYTH_INSTRUCTIONS[type].name}`} />;
            default: {
                // A new instruction type has to pick its card here rather than reach the raw fallback.
                const _exhaustive: never = type;
                return _exhaustive;
            }
        }
    } catch (error) {
        Logger.error(error, { signature });
    }

    return <RawOnlyPythCard node={node} title="Pyth: Unknown Instruction" />;
}

/** Raw hex is the whole content, so the card opens on it and the shell draws its own Program row. */
function RawOnlyPythCard({ node, title }: { node: InstructionNode; title: string }) {
    return <InstructionCardView node={node} title={title} defaultRaw />;
}
