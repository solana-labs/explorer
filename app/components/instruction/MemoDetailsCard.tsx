import { defineInstructionCard, type InstructionNode, preformatted } from '@entities/instruction-card';
import { ParsedInstruction } from '@solana/web3.js';
import { wrap } from '@utils/index';
import React from 'react';

/** The RPC parses a memo down to its UTF-8 payload, so the payload is the card's whole content. */
const MemoCard = defineInstructionCard<string>({
    fields: memo => [preformatted('Data (UTF-8)', wrap(memo, 50))],
    title: 'Memo Program: Memo',
});

export function MemoDetailsCard({
    ix,
    index,
    innerCards,
    childIndex,
}: {
    ix: ParsedInstruction;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const node: InstructionNode = { childIndex, index, innerCards, ix, programId: ix.programId };

    return <MemoCard node={node} info={ix.parsed} />;
}
