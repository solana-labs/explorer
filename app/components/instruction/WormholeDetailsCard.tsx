import { useCluster } from '@providers/cluster';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from './InstructionCard';
import { parsWormholeInstructionTitle } from './wormhole/types';

export function WormholeDetailsCard({
    ix,
    index,
    result,
    signature,
    innerCards,
    childIndex,
}: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    signature: string;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { url } = useCluster();

    let title;
    try {
        title = parsWormholeInstructionTitle(ix);
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
            title={`Wormhole: ${title || 'Unknown'}`}
            innerCards={innerCards}
            childIndex={childIndex}
            defaultRaw
        />
    );
}
