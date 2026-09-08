import { Cluster } from '@utils/cluster';
import { getTransactionInstructionError, type SupportedTransactionError } from '@utils/program-err';
import { getProgramName } from '@utils/tx';

import { Logger } from '@/app/shared/lib/logger';

export type LogMessage = {
    text: string;
    prefix: string;
    style: 'muted' | 'info' | 'success' | 'warning';
};

export type InstructionLogs = {
    invokedProgram: string | null;
    logs: LogMessage[];
    computeUnits: number;
    truncated: boolean;
    failed: boolean;
};

export function parseProgramLogs(
    logs: readonly string[],
    error: SupportedTransactionError | null | undefined,
    cluster: Cluster,
): InstructionLogs[] {
    let depth = 0;
    const prettyLogs: InstructionLogs[] = [];
    function prefixBuilder(
        // Indent level starts at 1.
        indentLevel: number,
    ) {
        let prefix;
        if (indentLevel <= 0) {
            Logger.warn('[utils:program-logs] Tried to build a prefix for a program log at invalid indent level', {
                indentLevel,
            });
            prefix = '';
        } else {
            prefix = new Array(indentLevel - 1).fill('\u00A0\u00A0').join('');
        }
        return `${prefix}> `;
    }

    let prettyError;
    if (error) {
        prettyError = getTransactionInstructionError(error);
    }

    logs.forEach(log => {
        if (log.startsWith('Program log:')) {
            // Use passive tense
            // eslint-disable-next-line no-restricted-syntax -- extract program log message
            log = log.replace(/Program log: (.*)/g, (match, p1) => {
                return `Program logged: "${p1}"`;
            });

            prettyLogs[prettyLogs.length - 1].logs.push({
                prefix: prefixBuilder(depth),
                style: 'muted',
                text: log,
            });
        } else if (log.startsWith('Program data:')) {
            prettyLogs[prettyLogs.length - 1].logs.push({
                prefix: prefixBuilder(depth),
                style: 'muted',
                text: log,
            });
        } else if (log.startsWith('Log truncated')) {
            prettyLogs[prettyLogs.length - 1].truncated = true;
        } else {
            // eslint-disable-next-line no-restricted-syntax -- match program invoke pattern
            const regex = /Program (\w*) invoke \[(\d)\]/g;
            const matches = Array.from(log.matchAll(regex));

            if (matches.length > 0) {
                const programAddress = matches[0][1];
                const programName = getProgramName(programAddress, cluster);

                if (depth === 0) {
                    prettyLogs.push({
                        computeUnits: 0,
                        failed: false,
                        invokedProgram: programAddress,
                        logs: [],
                        truncated: false,
                    });
                } else {
                    prettyLogs[prettyLogs.length - 1].logs.push({
                        prefix: prefixBuilder(depth),
                        style: 'info',
                        text: `Program invoked: ${programName}`,
                    });
                }

                depth++;
            } else if (log.includes('success')) {
                prettyLogs[prettyLogs.length - 1].logs.push({
                    prefix: prefixBuilder(depth),
                    style: 'success',
                    text: `Program returned success`,
                });
                depth--;
            } else if (log.includes('failed')) {
                const instructionLog = prettyLogs[prettyLogs.length - 1];
                instructionLog.failed = true;

                let currText = `Program returned error: "${log.slice(log.indexOf(': ') + 2)}"`;
                // failed to verify log of previous program so reset depth and print full log
                if (log.startsWith('failed')) {
                    depth++;
                    currText = log.charAt(0).toUpperCase() + log.slice(1);
                }

                instructionLog.logs.push({
                    prefix: prefixBuilder(depth),
                    style: 'warning',
                    text: currText,
                });
                depth--;
            } else {
                if (depth === 0) {
                    prettyLogs.push({
                        computeUnits: 0,
                        failed: false,
                        invokedProgram: null,
                        logs: [],
                        truncated: false,
                    });
                    depth++;
                }

                // Remove redundant program address from logs
                // eslint-disable-next-line no-restricted-syntax -- extract compute units consumed
                log = log.replace(/Program \w* consumed (\d*) (.*)/g, (match, p1, p2) => {
                    // Only aggregate compute units consumed from top-level tx instructions
                    // because they include inner ix compute units as well.
                    if (depth === 1) {
                        prettyLogs[prettyLogs.length - 1].computeUnits += Number.parseInt(p1);
                    }

                    return `Program consumed: ${p1} ${p2}`;
                });

                // native program logs don't start with "Program log:"
                prettyLogs[prettyLogs.length - 1].logs.push({
                    prefix: prefixBuilder(depth),
                    style: 'muted',
                    text: log,
                });
            }
        }
    });

    // If the instruction's simulation returned an error without any logs then add an empty log entry for Runtime error
    // For example BpfUpgradableLoader fails without returning any logs for Upgrade instruction with buffer that doesn't exist
    if (prettyError && prettyLogs.length === 0) {
        prettyLogs.push({
            computeUnits: 0,
            failed: true,
            invokedProgram: null,
            logs: [],
            truncated: false,
        });
    }

    if (prettyError && prettyError.index === prettyLogs.length - 1) {
        const failedIx = prettyLogs[prettyError.index];
        if (!failedIx.failed) {
            failedIx.failed = true;
            failedIx.logs.push({
                prefix: prefixBuilder(1),
                style: 'warning',
                text: `Runtime error: ${prettyError.message}`,
            });
        }
    }

    return prettyLogs;
}
