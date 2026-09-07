import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/shared/ui/tabs';
import { useExplorerLink } from '@entities/cluster';
import { ProgramLogs, TxErrorStatus, TxExecutionStatus, TxSimulationStatus } from '@entities/program-logs';
import { ReactNode } from 'react';

import { fromBase64Url, toBase64Url } from '@/app/shared/lib/bytes';
import { Card } from '@/app/shared/ui/Card';

import type { InstructionExecutionResult, InstructionSimulationResult } from '../model/transaction/types';

type InstructionExecutionActivityProps = {
    lastResult?: InstructionExecutionResult;
};

export function InstructionExecutionActivity({ lastResult }: InstructionExecutionActivityProps) {
    const tabs = [
        {
            component: (
                <ProgramLogs
                    header={lastResult && <InstructionExecutionStatusHeader lastResult={lastResult} />}
                    rawLogs={lastResult?.logs.raw ?? []}
                    parsedLogs={lastResult?.logs.parsed ?? []}
                />
            ),
            id: 'program-logs',
            title: 'Program logs',
        },
    ];
    return <CardWithTabs tabs={tabs} />;
}

type InstructionSimulationActivityProps = {
    lastSimulation?: InstructionSimulationResult;
};

export function InstructionSimulationActivity({ lastSimulation }: InstructionSimulationActivityProps) {
    const logs = lastSimulation && 'logs' in lastSimulation ? lastSimulation.logs : undefined;
    const tabs = [
        {
            component: (
                <ProgramLogs
                    header={lastSimulation && <SimulationStatusHeader lastSimulation={lastSimulation} />}
                    rawLogs={logs?.raw ?? []}
                    parsedLogs={logs?.parsed ?? []}
                />
            ),
            id: 'program-logs',
            title: 'Program logs',
        },
    ];
    return <CardWithTabs tabs={tabs} />;
}

function CardWithTabs({ tabs }: { tabs: { id: string; title: string; component: ReactNode }[] }) {
    return (
        <Card variant="tight" className="flex min-h-0 flex-grow flex-col">
            <Tabs defaultValue={tabs[0]?.id} className="flex min-h-0 flex-col">
                <div className="border-b border-neutral-950 px-6 [border-bottom-style:solid]">
                    <TabsList className="-mb-px">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.id} value={tab.id}>
                                {tab.title}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {tabs.map(tab => (
                    <TabsContent key={tab.id} value={tab.id} className="flex min-h-0 flex-1 flex-col px-6 py-2">
                        {tab.component}
                    </TabsContent>
                ))}
            </Tabs>
        </Card>
    );
}

function InstructionExecutionStatusHeader({ lastResult }: { lastResult: InstructionExecutionResult }) {
    const { link: txLink } = useExplorerLink(`/tx/${getTxSignature(lastResult) ?? ''}`);
    const { link: inspectorLink } = useExplorerLink(
        `/tx/inspector?message=${toInspectorMessageParam(getInspectorMessage(lastResult))}`,
    );

    if (lastResult.status === 'success') {
        return (
            <TxExecutionStatus
                status="success"
                signature={lastResult.signature}
                date={lastResult.finishedAt}
                link={txLink}
            />
        );
    }
    // Tx was sent to the network but an error occurred.
    if (lastResult.phase === 'broadcast_failed') {
        return (
            <StatusWithError errMessage={lastResult.message}>
                <TxExecutionStatus
                    status="error"
                    signature={lastResult.signature}
                    date={lastResult.finishedAt}
                    link={txLink}
                />
            </StatusWithError>
        );
    }
    // Tx failed before it could be sent to the network, so no signature.
    return (
        <StatusWithError errMessage={lastResult.message}>
            <TxErrorStatus
                message={lastResult.serializedTxMessage}
                date={lastResult.finishedAt}
                link={lastResult.serializedTxMessage ? inspectorLink : undefined}
            />
        </StatusWithError>
    );
}

function SimulationStatusHeader({ lastSimulation }: { lastSimulation: InstructionSimulationResult }) {
    const { link: inspectorLink } = useExplorerLink(
        `/tx/inspector?message=${toInspectorMessageParam(lastSimulation.serializedTxMessage)}`,
    );
    const link = lastSimulation.serializedTxMessage ? inspectorLink : undefined;

    if (lastSimulation.status === 'success') {
        return (
            <TxSimulationStatus
                status="success"
                unitsConsumed={lastSimulation.unitsConsumed}
                date={lastSimulation.finishedAt}
                link={link}
            />
        );
    }
    return (
        <StatusWithError errMessage={lastSimulation.message}>
            <TxSimulationStatus
                status="error"
                message={lastSimulation.serializedTxMessage}
                date={lastSimulation.finishedAt}
                link={link}
            />
        </StatusWithError>
    );
}

function toInspectorMessageParam(message: string | undefined): string {
    return message ? toBase64Url(fromBase64Url(message)) : '';
}

// Signature exists on a successful tx and on a broadcast that later failed; never on a local error.
function getTxSignature(result: InstructionExecutionResult): string | undefined {
    if (result.status === 'success') return result.signature;
    if (result.phase === 'broadcast_failed') return result.signature;
    return undefined;
}

// Only pre_broadcast_failed carries a serialized message worth an inspector link.
function getInspectorMessage(result: InstructionExecutionResult): string | undefined {
    if (result.status === 'error' && result.phase === 'pre_broadcast_failed') return result.serializedTxMessage;
    return undefined;
}

function StatusWithError({ children, errMessage }: { children: ReactNode; errMessage?: string }) {
    if (!errMessage) return <>{children}</>;

    return (
        <div className="flex flex-col gap-2">
            {children}
            <div className="text-sm tracking-tight text-destructive">{errMessage}</div>
        </div>
    );
}
