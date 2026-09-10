import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { BaseCUProfilingCard, formatInstructionLogs } from '@entities/compute-unit';
import { type NamedInstruction, resolveInstructionNames, type TransactionWithMeta } from '@entities/transaction-data';
import { useResolvedInstructionNames } from '@entities/transaction-data/client';
import { useCluster, useEpochScheduleResult } from '@providers/cluster';
import { useTransactionDetails } from '@providers/transactions';
import type { Cluster } from '@utils/cluster';
import { getEpochForSlot } from '@utils/epoch-schedule';
import type { SignatureProps } from '@utils/index';
import { type InstructionLogs, parseProgramLogs } from '@utils/program-logs';
import { useEffect, useMemo } from 'react';

import { Logger } from '@/app/shared/lib/logger';
import { baseCardVariants, CardBody } from '@/app/shared/ui/Card';

// FIXME: missing Storybook story — needs useTransactionDetails provider + TransactionWithMeta fixture.
export function CUProfilingSection({ signature }: SignatureProps) {
    const details = useTransactionDetails(signature);
    const { cluster } = useCluster();
    const { data: epochSchedule, error: epochScheduleError } = useEpochScheduleResult();

    const transactionWithMeta = details?.data?.transactionWithMeta;
    const logMessages = transactionWithMeta?.meta?.logMessages || undefined;
    const unitsConsumed = transactionWithMeta?.meta?.computeUnitsConsumed || undefined;
    const slot = transactionWithMeta?.slot;

    const instructionLogs: InstructionLogs[] = useMemo(
        () => formatTransactionLogs(transactionWithMeta, cluster),
        [transactionWithMeta, cluster],
    );

    // Every top-level instruction produces a row, Compute Budget included, so rows stay aligned by index
    // with the logs `instructionLogs` was parsed from.
    const named: NamedInstruction[] = useMemo(
        () =>
            transactionWithMeta?.transaction.message.instructions.map(ix => ({
                ...resolveInstructionNames(ix),
                programId: ix.programId,
            })) ?? [],
        [transactionWithMeta],
    );

    // Undefined names leave the card on its "Instruction #N" fallback, which is also what shows while the
    // IDL fetch is still in flight.
    const instructions = useResolvedInstructionNames(named);

    const instructionsForCU = useMemo(() => {
        if (!slot || !epochSchedule) return [];

        const epoch = getEpochForSlot(epochSchedule, BigInt(slot));

        return formatInstructionLogs({ cluster, epoch, instructionLogs, instructions });
    }, [instructions, instructionLogs, cluster, slot, epochSchedule]);

    // Keyed on the error, so this reports the fetch actually failing rather than the ordinary first
    // render, where the schedule has simply not arrived yet. An effect, not the render body: the render
    // body repeats the report on every render and doubles it under StrictMode.
    useEffect(() => {
        if (!epochScheduleError) return;
        Logger.warn('[cu-profiling] epoch schedule unavailable; CU profiling cannot render', {
            sentry: true,
            sentryExtras: { reason: String(epochScheduleError), signature },
        });
    }, [epochScheduleError, signature]);

    if (!logMessages || logMessages.length === 0) return undefined;

    // The transaction logged something, so this section owes the user a card — saying why it is empty
    // beats vanishing. Guarded on the value too: SWR keeps `error` beside a cached schedule, and a chart
    // we can still draw beats an excuse.
    if (epochScheduleError && !epochSchedule) {
        return (
            <CollapsibleCard title="CU profiling" className={baseCardVariants({ ui: 'dashkit' })}>
                <CardBody ui="dashkit">
                    <div className="text-xs text-muted">Unavailable: the epoch schedule could not be loaded.</div>
                </CardBody>
            </CollapsibleCard>
        );
    }

    if (instructionsForCU.length === 0) return undefined;

    return <BaseCUProfilingCard instructions={instructionsForCU} unitsConsumed={unitsConsumed} />;
}

function formatTransactionLogs(transactionWithMeta: TransactionWithMeta | null | undefined, cluster: Cluster) {
    const logMessages = transactionWithMeta?.meta?.logMessages || undefined;
    const err = transactionWithMeta?.meta?.err || undefined;

    return logMessages ? parseProgramLogs(logMessages, err, cluster) : [];
}
