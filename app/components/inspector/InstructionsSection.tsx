import { HexData } from '@components/common/HexData';
import { TableCardBody } from '@components/common/TableCardBody';
import { useCluster } from '@providers/cluster';
import { useScrollAnchor } from '@providers/scroll-anchor';
import { MessageCompiledInstruction, VersionedMessage } from '@solana/web3.js';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import { getProgramName } from '@utils/tx';
import React from 'react';

import { AddressFromLookupTableWithContext, AddressWithContext, programValidator } from './AddressWithContext';

export function InstructionsSection({ message }: { message: VersionedMessage }) {
    return (
        <>
            {message.compiledInstructions.map((ix, index) => {
                return <InstructionCard key={index} {...{ index, ix, message }} />;
            })}
        </>
    );
}

function InstructionCard({
    message,
    ix,
    index,
}: {
    message: VersionedMessage;
    ix: MessageCompiledInstruction;
    index: number;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const { cluster } = useCluster();
    const programId = message.staticAccountKeys[ix.programIdIndex];
    const programName = getProgramName(programId.toBase58(), cluster);
    const scrollAnchorRef = useScrollAnchor(getInstructionCardScrollAnchorId([index + 1]));
    const lookupsForAccountKeyIndex = [
        ...message.addressTableLookups.flatMap(lookup =>
            lookup.writableIndexes.map(index => ({
                lookupTableIndex: index,
                lookupTableKey: lookup.accountKey,
            }))
        ),
        ...message.addressTableLookups.flatMap(lookup =>
            lookup.readonlyIndexes.map(index => ({
                lookupTableIndex: index,
                lookupTableKey: lookup.accountKey,
            }))
        ),
    ];
    return (
        <div className="card" key={index} ref={scrollAnchorRef}>
            <div className={`card-header${!expanded ? ' border-bottom-none' : ''}`}>
                <h3 className="card-header-title mb-0 d-flex align-items-center">
                    <span className={`badge bg-info-soft me-2`}>#{index + 1}</span>
                    {programName} Instruction
                </h3>

                <button
                    className={`btn btn-sm d-flex ${expanded ? 'btn-black active' : 'btn-white'}`}
                    onClick={() => setExpanded(e => !e)}
                >
                    {expanded ? 'Collapse' : 'Expand'}
                </button>
            </div>
            {expanded && (
                <TableCardBody>
                    <tr>
                        <td>Program</td>
                        <td className="text-lg-end">
                            <AddressWithContext
                                pubkey={message.staticAccountKeys[ix.programIdIndex]}
                                validator={programValidator}
                            />
                        </td>
                    </tr>
                    {ix.accountKeyIndexes.map((accountIndex, index) => {
                        let lookup;
                        if (accountIndex >= message.staticAccountKeys.length) {
                            const lookupIndex = accountIndex - message.staticAccountKeys.length;
                            lookup = lookupsForAccountKeyIndex[lookupIndex];
                        }

                        return (
                            <tr key={index}>
                                <td>
                                    <div className="d-flex align-items-start flex-column">
                                        Account #{index + 1}
                                        <span className="mt-1">
                                            {accountIndex < message.header.numRequiredSignatures && (
                                                <span className="badge bg-info-soft me-2">Signer</span>
                                            )}
                                            {message.isAccountWritable(accountIndex) && (
                                                <span className="badge bg-danger-soft me-2">Writable</span>
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="text-lg-end">
                                    {lookup === undefined ? (
                                        <AddressWithContext pubkey={message.staticAccountKeys[accountIndex]} />
                                    ) : (
                                        <AddressFromLookupTableWithContext
                                            lookupTableKey={lookup.lookupTableKey}
                                            lookupTableIndex={lookup.lookupTableIndex}
                                        />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    <tr>
                        <td>
                            Instruction Data <span className="text-muted">(Hex)</span>
                        </td>
                        <td className="text-lg-end">
                            <HexData raw={Buffer.from(ix.data)} />
                        </td>
                    </tr>
                </TableCardBody>
            )}
        </div>
    );
}
