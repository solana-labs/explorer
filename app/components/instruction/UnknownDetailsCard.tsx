import { useCluster } from '@providers/cluster';
import { ParsedInstruction, SignatureResult, TransactionInstruction } from '@solana/web3.js';
import { getProgramName } from '@utils/tx';
import React from 'react';

import { InstructionCard } from './InstructionCard';

export function UnknownDetailsCard({
    ix,
    index,
    result,
    innerCards,
    childIndex,
}: {
    ix: TransactionInstruction | ParsedInstruction;
    index: number;
    result: SignatureResult;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { cluster } = useCluster();
    const programName = getProgramName(ix.programId.toBase58(), cluster);
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName}: Unknown Instruction`}
            innerCards={innerCards}
            childIndex={childIndex}
            defaultRaw
        />
    );
}
