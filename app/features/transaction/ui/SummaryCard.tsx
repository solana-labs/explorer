import { Address } from '@components/common/Address';
import { ErrorCard } from '@components/common/ErrorCard';
import { InfoTooltip } from '@components/common/InfoTooltip';
import { LoadingCard } from '@components/common/LoadingCard';
import { Signature } from '@components/common/Signature';
import { Slot } from '@components/common/Slot';
import { SolBalance } from '@components/common/SolBalance';
import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { estimateRequestedComputeUnitsForParsedTransaction } from '@entities/compute-unit';
import {
    BaseResourceFeeProjection,
    derivePriorityFeeLamports,
    estimateRequestedCostUnits,
    isSimd0553FeeEnabled,
    projectResourceAndInclusionFees,
} from '@entities/transaction-fee';
import { ViewReceiptButton } from '@features/receipt';
import { FetchStatus } from '@providers/cache';
import { useCluster, useClusterInfo } from '@providers/cluster';
import {
    TransactionStatusInfo,
    useFetchTransactionStatus,
    useTransactionDetails,
    useTransactionStatus,
} from '@providers/transactions';
import type { TransactionVersion } from '@solana/kit';
import { PACKET_DATA_SIZE, ParsedTransaction, SystemInstruction, SystemProgram } from '@solana/web3.js';
import { ClusterStatus } from '@utils/cluster';
import { displayTimestamp, displayTimestampUtc } from '@utils/date';
import { SignatureProps } from '@utils/index';
import { getTransactionInstructionError } from '@utils/program-err';
import { intoTransactionInstruction } from '@utils/tx';
import { useBuildClusterPath, useClusterPath } from '@utils/url';
import Link from 'next/link';
import { useEffect } from 'react';
import { ZoomIn } from 'react-feather';

import { Label, Row, Value } from '@/app/components/shared/ui/detail-row';
import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
import { DownloadDropdown } from '@/app/shared/components/DownloadDropdown';
import { AUTO_REFRESH_INTERVAL, AutoRefresh, WithAutoRefreshProp } from '@/app/shared/lib/use-auto-refresh';
import { V1_TRANSACTION_SIZE_LIMIT } from '@/app/shared/lib/v1-message-bridge';
import { Card } from '@/app/shared/ui/Card';
import { getEpochForSlot } from '@/app/utils/epoch-schedule';

import { TransactionNotFoundCard } from './TransactionNotFoundCard';

function getTransactionErrorReason(
    info: TransactionStatusInfo,
    tx: ParsedTransaction | undefined,
): { errorReason: string; errorLink?: string } {
    if (typeof info.result.err === 'string') {
        return { errorReason: `Runtime Error: "${info.result.err}"` };
    }

    const programError = getTransactionInstructionError(info.result.err);
    if (programError !== undefined) {
        return { errorReason: `Program Error: "Instruction #${programError.index + 1} Failed"` };
    }

    const { InsufficientFundsForRent } = info.result.err as { InsufficientFundsForRent?: { account_index: number } };
    if (InsufficientFundsForRent !== undefined) {
        const address = tx?.message.accountKeys[InsufficientFundsForRent.account_index]?.pubkey;
        if (address) {
            return { errorLink: `/address/${address}`, errorReason: `Insufficient Funds For Rent: ${address}` };
        }
        return { errorReason: `Insufficient Funds For Rent: Account #${InsufficientFundsForRent.account_index + 1}` };
    }

    return { errorReason: `Unknown Error: "${JSON.stringify(info.result.err)}"` };
}

export function SummaryCard({ signature, autoRefresh }: SignatureProps & WithAutoRefreshProp) {
    const fetchStatus = useFetchTransactionStatus();
    const fetchRaw = useFetchRawTransaction();
    const status = useTransactionStatus(signature);
    const details = useTransactionDetails(signature);
    const rawDetails = useRawTransactionDetails(signature);
    const { cluster, status: clusterStatus } = useCluster();
    const clusterInfo = useClusterInfo();
    const inspectPath = useClusterPath({ pathname: `/tx/${signature}/inspect` });
    // The error link's target is only known inside the render below, so this needs the callback form.
    const buildClusterPath = useBuildClusterPath();
    const receiptPath = useClusterPath({
        additionalParams: new URLSearchParams({ view: 'receipt' }),
        pathname: `/tx/${signature}`,
    });

    const serializedRawData = rawDetails?.data?.raw?.messageBytes;
    const serializedSize = rawDetails?.data?.raw?.serializedSize;
    // Read the version off the raw details rather than the parsed ones, so the size and the limit it
    // is compared against always come from the same fetch.
    const rawVersion = rawDetails?.data?.raw?.version;

    useEffect(() => {
        if (!rawDetails && clusterStatus === ClusterStatus.Connected) {
            fetchRaw(signature);
        }
    }, [signature, clusterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!status && clusterStatus === ClusterStatus.Connected) {
            fetchStatus(signature);
        }
    }, [signature, clusterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (autoRefresh === AutoRefresh.Active) {
            const intervalHandle: NodeJS.Timeout = setInterval(() => fetchStatus(signature), AUTO_REFRESH_INTERVAL);
            return () => {
                clearInterval(intervalHandle);
            };
        }
    }, [autoRefresh, fetchStatus, signature]);

    if (!status || (status.status === FetchStatus.Fetching && autoRefresh === AutoRefresh.Inactive)) {
        return <LoadingCard />;
    } else if (status.status === FetchStatus.FetchFailed) {
        return <ErrorCard retry={() => fetchStatus(signature)} text="Fetch Failed" />;
    } else if (!status.data?.info) {
        return (
            <TransactionNotFoundCard
                signature={signature}
                retry={() => fetchStatus(signature)}
                firstAvailableBlock={
                    clusterInfo?.firstAvailableBlock && clusterInfo.firstAvailableBlock > 0n
                        ? clusterInfo.firstAvailableBlock
                        : undefined
                }
            />
        );
    }

    const { info } = status.data;

    const transactionWithMeta = details?.data?.transactionWithMeta;
    const fee = transactionWithMeta?.meta?.fee;
    const costUnits = transactionWithMeta?.meta?.costUnits;
    const computeUnitsConsumed = transactionWithMeta?.meta?.computeUnitsConsumed;
    const transactionConfig = rawDetails?.data?.raw?.transactionConfig;
    // v1 declares its compute unit limit on the message; every earlier version has to have it
    // reconstructed from the Compute Budget instructions, which v1 does not carry.
    const reservedCUs =
        transactionConfig?.computeUnitLimit ??
        (transactionWithMeta?.transaction && transactionWithMeta.version !== 1
            ? estimateRequestedComputeUnitsForParsedTransaction(
                  transactionWithMeta.transaction,
                  clusterInfo ? getEpochForSlot(clusterInfo.epochSchedule, BigInt(info.slot)) : undefined,
                  cluster,
              )
            : undefined);
    const transaction = transactionWithMeta?.transaction;
    const blockhash = transaction?.message.recentBlockhash;
    const version = transactionWithMeta?.version;
    const feePayer = transaction?.message.accountKeys[0]?.pubkey;
    const priorityFeeLamports = readPriorityFeeLamports({
        declared: transactionConfig?.priorityFeeLamports,
        feeLamports: fee,
        signatureCount: transaction?.signatures.length,
    });
    // SIMD-0553 charges the cost units a transaction *requested*, while `costUnits` reports what it
    // executed, so the requested compute limit is needed to correct it. Without one there is nothing
    // honest to project, and the row is left out.
    const feeProjections =
        isSimd0553FeeEnabled() &&
        costUnits !== undefined &&
        computeUnitsConsumed !== undefined &&
        reservedCUs !== undefined &&
        priorityFeeLamports !== undefined
            ? projectResourceAndInclusionFees({
                  priorityFeeLamports,
                  requestedCostUnits: estimateRequestedCostUnits({
                      computeUnitsConsumed,
                      executedCostUnits: costUnits,
                      requestedComputeUnits: reservedCUs,
                  }),
              })
            : undefined;

    const isNonce = (() => {
        if (!transaction || transaction.message.instructions.length < 1) return false;
        const ix = intoTransactionInstruction(transaction, transaction.message.instructions[0]);
        return (
            ix &&
            SystemProgram.programId.equals(ix.programId) &&
            SystemInstruction.decodeInstructionType(ix) === 'AdvanceNonceAccount'
        );
    })();

    let statusClass: 'success' | 'warning' = 'success';
    let statusText = 'Success';
    let statusFinality = 'Finalized (MAX Confirmations)';
    let errorReason = undefined;
    let errorLink = undefined;

    if (info.result.err) {
        statusClass = 'warning';
        statusText = 'Error';

        const err = getTransactionErrorReason(info, transaction);
        errorReason = err.errorReason;
        if (err.errorLink !== undefined) {
            // Hand-assembling the query here gets the cluster slug, the endpoint encoding and the
            // pending-consent case wrong.
            errorLink = buildClusterPath(err.errorLink);
        }
    } else if (info.confirmations !== 'max') {
        statusFinality = `${info.confirmations ?? 0} confirmation${info.confirmations === 1 ? '' : 's'}`;
    }

    return (
        <section id="summary" className="flex flex-col gap-3">
            <div className="flex justify-between">
                <h2 className="m-0 text-lg font-normal text-white">Summary</h2>
                <div className="flex shrink-0 gap-1">
                    <ViewReceiptButton
                        signature={signature}
                        transactionWithMeta={transactionWithMeta}
                        receiptPath={receiptPath}
                    />
                    <Button variant="outline" size="sm" asChild aria-label="Inspect">
                        <Link href={inspectPath}>
                            <ZoomIn size={12} />
                            <span className="d-none d-md-inline">Inspect</span>
                        </Link>
                    </Button>
                    <RefreshButton
                        fetching={autoRefresh === AutoRefresh.Active}
                        analyticsSection="transaction_card"
                        onClick={() => fetchStatus(signature)}
                    />
                    <DownloadDropdown
                        filename={signature}
                        data={serializedRawData}
                        loading={rawDetails?.status === FetchStatus.Fetching}
                        error={
                            rawDetails?.status === FetchStatus.FetchFailed
                                ? new Error('Failed to fetch raw transaction')
                                : undefined
                        }
                    />
                </div>
            </div>

            <Card ui="dashkit">
                {/* Status */}
                <Row divider>
                    <Label>Status</Label>
                    <Value className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Badge ui="dashkit" variant={statusClass}>
                            {statusText}
                        </Badge>
                        {errorReason && (
                            <Badge
                                ui="dashkit"
                                variant={statusClass}
                                className="min-w-0 max-w-full !whitespace-normal break-words !text-left"
                            >
                                {errorLink ? <Link href={errorLink}>{errorReason}</Link> : errorReason}
                            </Badge>
                        )}
                    </Value>
                </Row>

                {/* Confirmation */}
                <Row divider>
                    <Label>Confirmation</Label>
                    <Value>{statusFinality}</Value>
                </Row>

                {/* Signature */}
                <Row divider>
                    <Label>Signature</Label>
                    <Value>
                        <Signature signature={signature} alignItems="start" noTruncate />
                    </Value>
                </Row>

                {/* Signed by (fee payer) */}
                {feePayer && (
                    <Row divider>
                        <Label>Fee payer</Label>
                        <Value>
                            <Address pubkey={feePayer} link noTruncate />
                        </Value>
                    </Row>
                )}

                {/* Slot */}
                <Row divider>
                    <Label>Slot</Label>
                    <Value>
                        <Slot slot={info.slot} link />
                    </Value>
                </Row>

                {/* Recent Blockhash / Nonce */}
                {blockhash && (
                    <Row divider>
                        <Label className="overflow-visible">
                            {isNonce ? (
                                'Nonce'
                            ) : (
                                <InfoTooltip text="Transactions use a previously confirmed blockhash as a nonce to prevent double spends">
                                    Recent Blockhash
                                </InfoTooltip>
                            )}
                        </Label>
                        <Value>{blockhash}</Value>
                    </Row>
                )}

                {/* Fee */}
                {fee !== undefined && (
                    <Row divider>
                        <Label>Fee</Label>
                        <Value>
                            <SolBalance lamports={fee} />
                        </Value>
                    </Row>
                )}

                {/* Projected fee under SIMD-0553's inclusion + burned resource fee model */}
                {fee !== undefined && feeProjections !== undefined && (
                    <Row divider>
                        <Label className="overflow-visible">
                            <InfoTooltip text="Not active yet. SIMD-0553 would charge a 2,500-lamport inclusion fee to the leader plus a burned resource fee on the cost units a transaction requests, replacing today's flat 5,000-per-signature base fee and leaving the priority fee unchanged. Estimated by swapping this transaction's consumed compute units for its requested limit; the loaded-accounts-data-size term still reflects what it loaded, so each figure is a floor.">
                                Fee under SIMD-0553
                            </InfoTooltip>
                        </Label>
                        <Value>
                            <BaseResourceFeeProjection currentFeeLamports={fee} projections={feeProjections} />
                        </Value>
                    </Row>
                )}

                {/* Transaction cost */}
                {costUnits !== undefined && (
                    <Row divider>
                        <Label>Transaction cost</Label>
                        <Value>{costUnits.toLocaleString('en-US')}</Value>
                    </Row>
                )}

                {/* CUs Consumed / Limit */}
                {computeUnitsConsumed !== undefined && reservedCUs !== undefined && (
                    <Row divider>
                        <Label>CUs Consumed / Limit</Label>
                        <Value>
                            {computeUnitsConsumed.toLocaleString('en-US')} / {reservedCUs.toLocaleString('en-US')}
                        </Value>
                    </Row>
                )}
                {computeUnitsConsumed !== undefined && reservedCUs === undefined && (
                    <Row divider>
                        <Label>CUs Consumed</Label>
                        <Value>{computeUnitsConsumed.toLocaleString('en-US')}</Value>
                    </Row>
                )}

                {/* v1 message-level resource limits */}
                {transactionConfig?.priorityFeeLamports !== undefined && (
                    <Row divider>
                        <Label className="overflow-visible">
                            <InfoTooltip text="A total amount paid for prioritization, unlike the per-compute-unit price used before v1">
                                Priority fee (total)
                            </InfoTooltip>
                        </Label>
                        <Value>
                            <SolBalance lamports={transactionConfig.priorityFeeLamports} />
                        </Value>
                    </Row>
                )}
                {transactionConfig?.loadedAccountsDataSizeLimit !== undefined && (
                    <Row divider>
                        <Label>Loaded accounts data size limit</Label>
                        <Value>{transactionConfig.loadedAccountsDataSizeLimit.toLocaleString('en-US')}</Value>
                    </Row>
                )}
                {transactionConfig?.heapSize !== undefined && (
                    <Row divider>
                        <Label>Heap size</Label>
                        <Value>{transactionConfig.heapSize.toLocaleString('en-US')}</Value>
                    </Row>
                )}

                {/* Transaction Version */}
                {version !== undefined && (
                    <Row divider>
                        <Label>Transaction Version</Label>
                        <Value className="uppercase">{formatTransactionVersion(version)}</Value>
                    </Row>
                )}

                {/* Transaction size */}
                {serializedSize !== undefined && (
                    <Row divider>
                        <Label className="overflow-visible">
                            <InfoTooltip text="Size on the wire: signatures plus the compiled message">
                                Transaction size
                            </InfoTooltip>
                        </Label>
                        <Value className="flex flex-wrap items-baseline gap-x-2">
                            {serializedSize.toLocaleString('en-US')} bytes
                            {/* No over-limit styling here, unlike the inspector: a transaction that
                                landed is necessarily within the limit. The cap is context for headroom. */}
                            <span className="text-xs text-outer-space-300">
                                Max is {transactionSizeLimit(rawVersion).toLocaleString('en-US')} bytes
                            </span>
                        </Value>
                    </Row>
                )}

                {/* Timestamp */}
                {info.timestamp !== 'unavailable' ? (
                    <>
                        <Row divider>
                            <Label>Timestamp (Local)</Label>
                            <Value>
                                <span className="font-mono">{displayTimestamp(info.timestamp * 1000, true)}</span>
                            </Value>
                        </Row>
                        <Row>
                            <Label>Timestamp (UTC)</Label>
                            <Value>
                                <span className="font-mono">{displayTimestampUtc(info.timestamp * 1000, true)}</span>
                            </Value>
                        </Row>
                    </>
                ) : (
                    <Row>
                        <Label>Timestamp</Label>
                        <Value>
                            <InfoTooltip bottom text="Timestamps are only available for confirmed blocks">
                                Unavailable
                            </InfoTooltip>
                        </Value>
                    </Row>
                )}
            </Card>
        </section>
    );
}

/**
 * SIMD-0553 carries priority fees over unchanged, so projecting a total needs them split out of the
 * single summed `fee` the RPC reports. v1 declares its total priority fee on the message; every
 * earlier version has to have it backed out of the total.
 */
function readPriorityFeeLamports({
    declared,
    feeLamports,
    signatureCount,
}: {
    declared: bigint | number | undefined;
    feeLamports: number | undefined;
    signatureCount: number | undefined;
}): number | undefined {
    if (declared !== undefined) {
        return Number(declared);
    }
    if (feeLamports === undefined || signatureCount === undefined) {
        return undefined;
    }
    return derivePriorityFeeLamports({ feeLamports, signatureCount });
}

function formatTransactionVersion(version: TransactionVersion): string {
    return version === 'legacy' ? version : `v${version}`;
}

/**
 * v1 raised the ceiling past the UDP packet size every earlier version is bounded by. Matches the
 * inspector's limit, so the same transaction reads the same on both pages.
 *
 * Deliberately not kit's `getTransactionSizeLimit`: that one masks the first message byte and treats
 * `1` as v1, but a legacy message opens with its signer count — so every single-signer legacy
 * transaction comes back as 4096. Keyed off the decoded version, which can't be confused that way.
 */
function transactionSizeLimit(version: TransactionVersion | undefined): number {
    return version === 1 ? V1_TRANSACTION_SIZE_LIMIT : PACKET_DATA_SIZE;
}
