import { useCluster } from '@providers/cluster';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { parseAddressLookupTableInstructionTitle } from './address-lookup-table/types';
import { InstructionCard } from './InstructionCard';

export function AddressLookupTableDetailsCard({
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
        title = parseAddressLookupTableInstructionTitle(ix);
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
            title={`Address Lookup Table: ${title || 'Unknown'}`}
            innerCards={innerCards}
            childIndex={childIndex}
            defaultRaw
        />
    );
}
