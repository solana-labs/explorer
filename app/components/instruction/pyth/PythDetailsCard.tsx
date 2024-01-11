import { useCluster } from '@providers/cluster';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import AddMappingDetailsCard from './AddMappingDetailsCard';
import AddPriceDetailsCard from './AddPriceDetailsCard';
import AddProductDetailsCard from './AddProductDetailsCard';
import AggregatePriceDetailsCard from './AggregatePriceDetailsCard';
import BasePublisherOperationCard from './BasePublisherOperationCard';
import InitMappingDetailsCard from './InitMappingDetailsCard';
import InitPriceDetailsCard from './InitPriceDetailsCard';
import { PythInstruction } from './program';
import SetMinPublishersDetailsCard from './SetMinPublishersDetailsCard';
import UpdatePriceDetailsCard from './UpdatePriceDetailsCard';
import UpdateProductDetailsCard from './UpdateProductDetailsCard';

export function PythDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    signature: string;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { url } = useCluster();
    const { ix, index, result, signature, innerCards, childIndex } = props;

    try {
        const ixType = PythInstruction.decodeInstructionType(ix);

        switch (ixType) {
            case 'InitMapping':
                return <InitMappingDetailsCard info={PythInstruction.decodeInitMapping(ix)} {...props} />;
            case 'AddMapping':
                return <AddMappingDetailsCard info={PythInstruction.decodeAddMapping(ix)} {...props} />;
            case 'AddProduct':
                return <AddProductDetailsCard info={PythInstruction.decodeAddProduct(ix)} {...props} />;
            case 'UpdateProduct':
                return <UpdateProductDetailsCard info={PythInstruction.decodeUpdateProduct(ix)} {...props} />;
            case 'AddPrice':
                return <AddPriceDetailsCard info={PythInstruction.decodeAddPrice(ix)} {...props} />;
            case 'AddPublisher':
                return (
                    <BasePublisherOperationCard
                        operationName="Add Publisher"
                        info={PythInstruction.decodeAddPublisher(ix)}
                        {...props}
                    />
                );
            case 'DeletePublisher':
                return (
                    <BasePublisherOperationCard
                        operationName="Delete Publisher"
                        info={PythInstruction.decodeDeletePublisher(ix)}
                        {...props}
                    />
                );
            case 'UpdatePrice':
                return <UpdatePriceDetailsCard info={PythInstruction.decodeUpdatePrice(ix)} {...props} />;

            case 'UpdatePriceNoFailOnError':
                return <UpdatePriceDetailsCard info={PythInstruction.decodeUpdatePriceNoFailOnError(ix)} {...props} />;
            case 'AggregatePrice':
                return <AggregatePriceDetailsCard info={PythInstruction.decodeAggregatePrice(ix)} {...props} />;
            case 'InitPrice':
                return <InitPriceDetailsCard info={PythInstruction.decodeInitPrice(ix)} {...props} />;
            case 'SetMinPublishers':
                return <SetMinPublishersDetailsCard info={PythInstruction.decodeSetMinPublishers(ix)} {...props} />;
        }
    } catch (error) {
        console.error(error, {
            signature: signature,
            url: url,
        });
    }

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`Pyth: Unknown Instruction`}
            innerCards={innerCards}
            childIndex={childIndex}
            defaultRaw
        />
    );
}
