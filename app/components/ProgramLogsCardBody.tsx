import { TableCardBody } from '@components/common/TableCardBody';
import { useAnchorProgram } from '@entities/idl';
import { ParsedMessage, PublicKey, TransactionInstruction, VersionedMessage } from '@solana/web3.js';
import { getAnchorNameForInstruction, getAnchorProgramName } from '@utils/anchor';
import { Cluster } from '@utils/cluster';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import { camelToTitleCase } from '@utils/index';
import { InstructionLogs } from '@utils/program-logs';
import { ProgramName } from '@utils/program-name';
import { programLabel } from '@utils/tx';
import { useClusterPath } from '@utils/url';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { ChevronsUp } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { fromBase64, toBuffer } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';
import { BaseTable } from '@/app/shared/ui/Table';

// Matches the compiled dashkit `.text-*` colors the legacy `text-${log.style}` template resolved to (dark theme).
const logTextVariants = cva('', {
    variants: {
        variant: {
            info: 'text-dk-info',
            muted: 'text-dk-gray-700',
            success: 'text-dk-success-on-dark',
            warning: 'text-dk-warning-on-dark',
        },
    },
});

const NATIVE_PROGRAMS_MISSING_INVOKE_LOG: string[] = [
    'AddressLookupTab1e1111111111111111111111111',
    'ZkTokenProof1111111111111111111111111111111',
    'BPFLoader1111111111111111111111111111111111',
    'BPFLoader2111111111111111111111111111111111',
    'BPFLoaderUpgradeab1e11111111111111111111111',
];

function ProgramNameWithInstruction({
    programId,
    cluster,
    url,
    instructionName,
    anchorProgram,
}: {
    programId: PublicKey;
    cluster: Cluster;
    url: string;
    instructionName: string;
    anchorProgram: any;
}) {
    // Try to get the program name as a string
    const nativeLabel = programLabel(programId.toBase58(), cluster);
    const anchorLabel = anchorProgram ? getAnchorProgramName(anchorProgram) : undefined;
    const programNameStr = nativeLabel || anchorLabel;

    // If we have a program name string, we can intelligently format it
    if (programNameStr) {
        // Check if the program name ends with "Program"
        if (programNameStr.endsWith(' Program')) {
            // Replace "Program" with instruction name
            const baseName = programNameStr.slice(0, -8); // Remove " Program"
            return (
                <>
                    {baseName} {instructionName}
                </>
            );
        } else {
            // Just append instruction name
            return (
                <>
                    {programNameStr} {instructionName}
                </>
            );
        }
    }

    // Fallback to component-based rendering
    return (
        <>
            <ProgramName programId={programId} cluster={cluster} url={url} /> {instructionName}
        </>
    );
}

export function ProgramLogsCardBody({
    message,
    logs,
    cluster,
    url,
    className,
}: {
    message: VersionedMessage | ParsedMessage;
    logs: InstructionLogs[];
    cluster: Cluster;
    url: string;
    /** Passed through to the underlying table body — used for dense row padding in the inspector panel. */
    className?: string;
}) {
    let logIndex = 0;
    let instructionProgramIds: PublicKey[];
    let instructions: any[];

    if ('compiledInstructions' in message) {
        instructionProgramIds = message.compiledInstructions.map(ix => {
            return message.staticAccountKeys[ix.programIdIndex];
        });
        instructions = message.compiledInstructions;
    } else {
        instructionProgramIds = message.instructions.map(ix => ix.programId);
        instructions = message.instructions;
    }

    return (
        <TableCardBody className={className}>
            {instructionProgramIds.map((programId, index) => {
                const programAddress = programId.toBase58();
                let programLogs: InstructionLogs | undefined = logs[logIndex];
                if (programLogs?.invokedProgram === programAddress) {
                    logIndex++;
                } else if (
                    programLogs?.invokedProgram === null &&
                    programLogs.logs.length > 0 &&
                    NATIVE_PROGRAMS_MISSING_INVOKE_LOG.includes(programAddress)
                ) {
                    logIndex++;
                } else {
                    programLogs = undefined;
                }

                let badgeColor = 'white';
                if (programLogs) {
                    badgeColor = programLogs.failed ? 'warning' : 'success';
                }

                return (
                    <ProgramLogRow
                        badgeColor={badgeColor}
                        cluster={cluster}
                        key={index}
                        index={index}
                        programId={programId}
                        programLogs={programLogs}
                        url={url}
                        message={message}
                        instruction={instructions[index]}
                    />
                );
            })}
        </TableCardBody>
    );
}

function ProgramLogRow({
    badgeColor,
    cluster,
    index,
    programId,
    programLogs,
    url,
    message,
    instruction,
}: {
    badgeColor: string;
    cluster: Cluster;
    index: number;
    programId: PublicKey;
    programLogs?: InstructionLogs;
    url: string;
    message: VersionedMessage | ParsedMessage;
    instruction: any;
}) {
    const pathname = usePathname();
    const anchorPath = useClusterPath({ pathname: `${pathname}#${getInstructionCardScrollAnchorId([index + 1])}` });
    const { program: anchorProgram } = useAnchorProgram(programId.toString(), url, cluster);

    // Try to get instruction name from IDL if available
    let instructionName = 'Instruction';

    if (anchorProgram) {
        try {
            let txInstruction: TransactionInstruction | undefined;

            if ('compiledInstructions' in message) {
                // VersionedMessage with compiledInstructions
                const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } =
                    message.header;

                const accounts = instruction.accountKeyIndexes.map((accountIndex: number) => {
                    const pubkey = message.staticAccountKeys[accountIndex];

                    // Determine if account is signer and writable based on message header
                    let isSigner = false;
                    let isWritable = true;

                    if (accountIndex < numRequiredSignatures) {
                        isSigner = true;
                        if (accountIndex >= numRequiredSignatures - numReadonlySignedAccounts) {
                            isWritable = false;
                        }
                    } else if (accountIndex >= message.staticAccountKeys.length - numReadonlyUnsignedAccounts) {
                        isWritable = false;
                    }

                    return {
                        isSigner,
                        isWritable,
                        pubkey,
                    };
                });

                txInstruction = new TransactionInstruction({
                    data: toBuffer(instruction.data),
                    keys: accounts,
                    programId,
                });
            } else if ('instructions' in message && !('parsed' in instruction)) {
                // ParsedMessage with PartiallyDecodedInstruction
                const keys = instruction.accounts.map((account: PublicKey) => {
                    const accountKey = message.accountKeys.find(({ pubkey }) => pubkey.equals(account));
                    return {
                        isSigner: accountKey?.signer || false,
                        isWritable: accountKey?.writable || false,
                        pubkey: account,
                    };
                });

                txInstruction = new TransactionInstruction({
                    data: toBuffer(fromBase64(instruction.data)),
                    keys,
                    programId,
                });
            }

            if (txInstruction) {
                const decodedName = getAnchorNameForInstruction(txInstruction, anchorProgram);
                if (decodedName) {
                    instructionName = camelToTitleCase(decodedName);
                }
            }
        } catch (error) {
            Logger.error(error);
        }
    }

    return (
        <BaseTable.Row data-ix-index={index}>
            <BaseTable.Cell>
                <Link className="flex items-center" href={anchorPath}>
                    {/* badgeColor='white' falls through to a plain `.badge` (no bg-white-soft is defined in dashkit) — same as legacy. */}
                    <Badge
                        ui="dashkit"
                        variant={badgeColor === 'success' || badgeColor === 'warning' ? badgeColor : 'default'}
                        className="mr-1.5"
                    >
                        #{index + 1}
                    </Badge>
                    <span className="text-dk-white">
                        <ProgramNameWithInstruction
                            programId={programId}
                            cluster={cluster}
                            url={url}
                            instructionName={instructionName}
                            anchorProgram={anchorProgram}
                        />
                    </span>
                    <ChevronsUp className="m-1.5 cursor-pointer" size={13} />
                </Link>
                {programLogs && (
                    <div className="flex flex-col items-start whitespace-pre-wrap break-all p-1.5 font-mono">
                        {programLogs.logs.map((log, key) => {
                            return (
                                <span key={key}>
                                    <span className="text-dk-gray-700">{log.prefix}</span>
                                    <span className={logTextVariants({ variant: log.style })}>{log.text}</span>
                                </span>
                            );
                        })}
                    </div>
                )}
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
