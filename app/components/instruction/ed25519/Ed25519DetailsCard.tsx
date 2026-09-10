import {
    address,
    custom,
    defineInstructionCard,
    heading,
    type InstructionFieldList,
    type InstructionNode,
    text,
} from '@entities/instruction-card';
import { ParsedTransaction, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { toBase64 } from '@/app/shared/lib/bytes';

import { Copyable } from '../../common/Copyable';
import { type Ed25519SignatureDetails, resolveEd25519Signatures } from './decode';

const INVALID_REFERENCE = 'Invalid reference';

const Ed25519VerifyCard = defineInstructionCard<Ed25519SignatureDetails[]>({
    fields: signatures => signatures.flatMap(signatureFields),
    title: 'Ed25519: Verify Signature',
});

export function Ed25519DetailsCard({
    tx,
    ix,
    index,
    innerCards,
    childIndex,
}: {
    tx: ParsedTransaction;
    ix: TransactionInstruction;
    index: number;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const node: InstructionNode = { childIndex, index, innerCards, ix, programId: ix.programId };

    return <Ed25519VerifyCard node={node} info={resolveEd25519Signatures(tx, ix.data)} />;
}

/** One instruction verifies any number of signatures, so each gets its own group of rows. */
function signatureFields(
    { signature, publicKey, message }: Ed25519SignatureDetails,
    index: number,
): InstructionFieldList {
    return [
        heading(`Signature #${index + 1}`),
        text('Signature Reference', referenceText(signature)),
        signature.bytes
            ? custom('Signature', <Base64Value value={toBase64(signature.bytes)} />)
            : text('Signature', INVALID_REFERENCE),
        text('Public Key Reference', referenceText(publicKey)),
        publicKey.pubkey ? address('Public Key', publicKey.pubkey) : text('Public Key', INVALID_REFERENCE),
        text('Message Reference', `${referenceText(message)}, Size ${message.size}`),
        message.bytes
            ? custom('Message', <Base64Value value={toBase64(message.bytes)} wrapped />)
            : text('Message', INVALID_REFERENCE),
    ];
}

function referenceText({ instructionIndex, offset }: { instructionIndex?: number; offset: number }): string {
    const source = instructionIndex === undefined ? 'This instruction' : `Instruction ${instructionIndex}`;
    return `${source}, Offset ${offset}`;
}

/**
 * `wrapped` is for the message, the only field long enough that breaking it beats scrolling. It has
 * to be a block: on an inline span the tighter line-height is inert, because the cell's own
 * line-height still sets each line box.
 */
function Base64Value({ value, wrapped }: { value: string; wrapped?: boolean }) {
    const copyable = (
        <Copyable text={value}>
            <span className="font-mono">{value}</span>
        </Copyable>
    );
    if (!wrapped) return copyable;
    return <span className="block whitespace-normal break-all text-[0.85rem] leading-[1.2]">{copyable}</span>;
}
