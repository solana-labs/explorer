import { address, defineInstructionCard, type InstructionNode, preformatted, text } from '@entities/instruction-card';
import { ParsedInstruction, ParsedTransaction, SignatureResult } from '@solana/web3.js';
import { wrap } from '@utils/index';
import { ParsedInfo } from '@validators/index';
import React from 'react';
import { create } from 'superstruct';

import { Logger } from '@/app/shared/lib/logger';

import { UnknownDetailsCard } from '../UnknownDetailsCard';
import { FinalizeInfo, WriteInfo } from './types';

type DetailsProps = {
    tx: ParsedTransaction;
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    innerCards?: JSX.Element[];
    childIndex?: number;
};

export function BpfLoaderDetailsCard(props: DetailsProps) {
    const node: InstructionNode = {
        childIndex: props.childIndex,
        index: props.index,
        innerCards: props.innerCards,
        ix: props.ix,
        programId: props.ix.programId,
    };

    try {
        const parsed = create(props.ix.parsed, ParsedInfo);

        switch (parsed.type) {
            case 'write': {
                const info = create(parsed.info, WriteInfo);
                return <BpfLoaderWriteDetailsCard info={info} node={node} />;
            }
            case 'finalize': {
                const info = create(parsed.info, FinalizeInfo);
                return <BpfLoaderFinalizeDetailsCard info={info} node={node} />;
            }
            default:
                return <UnknownDetailsCard {...props} />;
        }
    } catch (error) {
        Logger.error(error, {
            signature: props.tx.signatures[0],
        });
        return <UnknownDetailsCard {...props} />;
    }
}

export const BpfLoaderWriteDetailsCard = defineInstructionCard<WriteInfo>({
    fields: info => [
        address('Account', info.account),
        preformatted('Bytes (Base 64)', wrap(info.bytes, 50)),
        text('Offset', info.offset),
    ],
    title: 'BPF Loader 2: Write',
});

export const BpfLoaderFinalizeDetailsCard = defineInstructionCard<FinalizeInfo>({
    fields: info => [address('Account', info.account)],
    title: 'BPF Loader 2: Finalize',
});
