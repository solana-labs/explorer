import { isTokenProgramData } from '@providers/accounts';
import { ConfirmedSignatureInfo } from '@solana/web3.js';
import { getTokenProgramInstructionName, InstructionType } from '@utils/instruction';
import React from 'react';
import { MinusSquare, PlusSquare } from 'react-feather';

export function InstructionDetails({
    instructionType,
    tx,
}: {
    instructionType: InstructionType;
    tx: ConfirmedSignatureInfo;
}) {
    const [expanded, setExpanded] = React.useState(false);

    const instructionTypes = instructionType.innerInstructions
        .map(ix => {
            if ('parsed' in ix && isTokenProgramData(ix)) {
                return getTokenProgramInstructionName(ix, tx);
            }
            return undefined;
        })
        .filter(type => type !== undefined);

    return (
        <>
            <p className="tree">
                {instructionTypes.length > 0 && (
                    <span
                        onClick={e => {
                            e.preventDefault();
                            setExpanded(!expanded);
                        }}
                        className="c-pointer me-2"
                    >
                        {expanded ? (
                            <MinusSquare className="align-text-top" size={13} />
                        ) : (
                            <PlusSquare className="align-text-top" size={13} />
                        )}
                    </span>
                )}
                {instructionType.name}
            </p>
            {expanded && (
                <ul className="tree">
                    {instructionTypes.map((type, index) => {
                        return <li key={index}>{type}</li>;
                    })}
                </ul>
            )}
        </>
    );
}
