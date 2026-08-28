'use client';

import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import { useFetchAccountInfo } from '@providers/accounts';
import { FetchStatus } from '@providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@providers/transactions/raw';
import usePrevious from '@react-hook/previous';
import { getBase58Decoder, getBase58Encoder } from '@solana/kit';
import {
    type CompiledInnerInstruction,
    Connection,
    MessageV0,
    PACKET_DATA_SIZE,
    PublicKey,
    VersionedMessage,
} from '@solana/web3.js';
import { generated, getBatchTransactionPda, PROGRAM_ADDRESS as SQUADS_V4_PROGRAM_ADDRESS } from '@sqds/multisig';
import { ClusterStatus } from '@utils/cluster';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import useSWR from 'swr';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { useSimulation } from '@/app/features/instruction-simulation/model/use-simulation';
import { generateTokenBalanceRows, TokenBalancesCardInner } from '@/app/features/transaction';
import { useCluster } from '@/app/providers/cluster';
import { DownloadDropdown } from '@/app/shared/components/DownloadDropdown';
import { toBase64 } from '@/app/shared/lib/bytes';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';
import {
    bridgeV1MessageBytes,
    isV1MessageBytes,
    V1_TRANSACTION_SIZE_LIMIT,
    type V1TransactionConfig,
} from '@/app/shared/lib/v1-message-bridge';
import { Card, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseNavigationTabs } from '@/app/shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { PageContainer } from '@/app/shared/ui/page-container/PageContainer';
import { useClusterPath } from '@/app/utils/url';

import { AccountsCard } from './AccountsCard';
import { AddressTableLookupsCard } from './AddressTableLookupsCard';
import { AddressWithContext, createFeePayerValidator } from './AddressWithContext';
import { InspectorSimulationPanel } from './InspectorSimulationPanel';
import { InstructionsSection } from './InstructionsSection';
import { MIN_MESSAGE_LENGTH, RawInput } from './RawInputCard';
import { TransactionSignatures } from './SignaturesCard';

const BASE58_ENCODER = getBase58Encoder();
const BASE58_DECODER = getBase58Decoder();

const { Batch, VaultBatchTransaction, VaultTransaction, batchDiscriminator } = generated;

// Convert a Squads VaultTransactionMessage (shared by VaultTransaction and the inner
// transactions of a Batch) into a web3.js VersionedMessage the inspector can render.
export function vaultMessageToVersionedMessage(message: typeof VaultTransaction.prototype.message): VersionedMessage {
    return new MessageV0({
        addressTableLookups: message.addressTableLookups.map(x => ({
            ...x,
            readonlyIndexes: Array.from(x.readonlyIndexes),
            writableIndexes: Array.from(x.writableIndexes),
        })),
        compiledInstructions: message.instructions.map(instruction => ({
            accountKeyIndexes: Array.from(instruction.accountIndexes),
            data: instruction.data,
            programIdIndex: instruction.programIdIndex,
        })),
        header: {
            numReadonlySignedAccounts: message.numSigners - message.numWritableSigners,
            numReadonlyUnsignedAccounts:
                message.accountKeys.length - message.numSigners - message.numWritableNonSigners,
            numRequiredSignatures: message.numSigners,
        },
        recentBlockhash: BASE58_DECODER.decode(Uint8Array.from(new Array(32).fill(0))),
        staticAccountKeys: message.accountKeys,
    });
}

export type TransactionData = {
    rawMessage: Uint8Array;
    message: VersionedMessage;
    /**
     * Set when `rawMessage` holds a v1 message. `message` is then a bridged view whose
     * `version` getter still reports 0, so version-dependent rendering must read this field.
     */
    version?: 1;
    /** Message-level resource limits; v1 only, and only when the message sets at least one. */
    transactionConfig?: V1TransactionConfig;
    signatures?: (string | undefined)[];
    accountBalances?: {
        preBalances: number[];
        postBalances: number[];
    };
    compiledInnerInstructions?: CompiledInnerInstruction[];
};

export type SquadsProposalAccountData = {
    account: string;
};

export type InspectorData = TransactionData | SquadsProposalAccountData;

function isSquadsProposalAccountData(data: InspectorData): data is SquadsProposalAccountData {
    return 'account' in data;
}

// Decode a url param and return the result. If decoding fails, return whether
// the param should be deleted.
function decodeParam(params: URLSearchParams, name: string): string | boolean {
    const param = params.get(name);
    if (param === null) return false;
    try {
        return decodeURIComponent(param);
    } catch (_err) {
        return true;
    }
}

// Decode a signatures param and throw an error on failure
function decodeSignatures(signaturesParam: string): (string | undefined)[] {
    let signatures;
    try {
        signatures = JSON.parse(signaturesParam);
    } catch (_err) {
        throw new Error('Signatures param is not valid JSON');
    }

    if (!Array.isArray(signatures)) {
        throw new Error('Signatures param is not a JSON array');
    }

    const validSignatures: (string | undefined)[] = [];
    for (const signature of signatures) {
        if (signature === null || signature === undefined) {
            validSignatures.push(undefined);
            continue;
        }

        if (typeof signature !== 'string') {
            throw new Error('Signature is not a string');
        }

        try {
            BASE58_ENCODER.encode(signature);
            validSignatures.push(signature);
        } catch (_err) {
            throw new Error('Signature is not valid base58');
        }
    }

    return validSignatures;
}

// Decodes url params into transaction data if possible. If decoding fails,
// URL params are returned as a string that will prefill the transaction
// message input field for debugging. Returns a tuple of [result, shouldRefreshUrl]
function decodeUrlParams(
    params: URLSearchParams,
): [TransactionData | string | SquadsProposalAccountData, URLSearchParams, boolean] {
    const messageParam = decodeParam(params, 'message');
    const signaturesParam = decodeParam(params, 'signatures');
    const squadsTxParam = decodeParam(params, 'squadsTx');

    let refreshUrl = false;
    if (signaturesParam === true) {
        params.delete('signatures');
        refreshUrl = true;
    }

    // Check for Squads transaction parameter
    if (typeof squadsTxParam === 'string') {
        try {
            // Validate that it's a valid public key
            new PublicKey(squadsTxParam);
            return [{ account: squadsTxParam }, params, refreshUrl];
        } catch (_err) {
            params.delete('squadsTx');
            refreshUrl = true;
        }
    }

    if (typeof messageParam === 'boolean') {
        if (messageParam) {
            params.delete('message');
            params.delete('signatures');
            refreshUrl = true;
        }
        return ['', params, refreshUrl];
    }

    let signatures: (string | undefined)[] | undefined = undefined;
    if (typeof signaturesParam === 'string') {
        try {
            signatures = decodeSignatures(signaturesParam);
        } catch (_err) {
            params.delete('signatures');
            refreshUrl = true;
        }
    }

    try {
        const buffer = Uint8Array.from(atob(messageParam), c => c.charCodeAt(0));

        if (buffer.length < MIN_MESSAGE_LENGTH) {
            throw new Error('message buffer is too short');
        }

        if (isV1MessageBytes(buffer)) {
            const { message, transactionConfig } = bridgeV1MessageBytes(buffer);
            return [{ message, rawMessage: buffer, signatures, transactionConfig, version: 1 }, params, refreshUrl];
        }

        const message = VersionedMessage.deserialize(buffer);
        const data = {
            message,
            rawMessage: buffer,
            signatures,
        };
        return [data, params, refreshUrl];
    } catch (_err) {
        params.delete('message');
        refreshUrl = true;
        return [messageParam, params, true];
    }
}

function SquadsProposalInspectorCard({ account, onClear }: { account: string; onClear: () => void }) {
    const { url } = useCluster();
    const [selected, setSelected] = React.useState(0);

    // Reset the selected inner transaction whenever a different account is inspected.
    React.useEffect(() => {
        setSelected(0);
    }, [account]);

    const fetcher = React.useCallback(async (): Promise<(VersionedMessage | undefined)[]> => {
        const connection = new Connection(url);
        const pubkey = new PublicKey(account);

        // First check if the account exists and is owned by the Squads program
        const accountInfo = await connection.getAccountInfo(pubkey, 'confirmed');
        if (!accountInfo) {
            throw new Error('Account not found');
        }
        if (accountInfo.owner.toString() !== SQUADS_V4_PROGRAM_ADDRESS.toString()) {
            throw new Error(`Account ${account} is not a valid Squads transaction account`);
        }

        // The account discriminator (first 8 bytes) distinguishes a Batch — which holds
        // many inner transactions — from a single VaultTransaction.
        const discriminator = accountInfo.data.subarray(0, 8);
        const isBatch = batchDiscriminator.every((byte, i) => byte === discriminator[i]);

        if (isBatch) {
            const batch = await Batch.fromAccountAddress(connection, pubkey, 'confirmed');
            const batchIndex = BigInt(batch.index.toString());
            // Inner VaultBatchTransactions are 1-indexed PDAs derived from the multisig + batch index.
            // Each fetch is isolated so one unavailable transaction (e.g. a PDA closed after
            // execution) doesn't sink the whole batch — failed slots become undefined and render
            // an "unavailable" notice below.
            const results = await Promise.all(
                Array.from({ length: batch.size }, async (_unused, i) => {
                    try {
                        const [pda] = getBatchTransactionPda({
                            batchIndex,
                            multisigPda: batch.multisig,
                            transactionIndex: i + 1,
                        });
                        const vbt = await VaultBatchTransaction.fromAccountAddress(connection, pda, 'confirmed');
                        return vaultMessageToVersionedMessage(vbt.message);
                    } catch {
                        return undefined;
                    }
                }),
            );
            if (results.every(message => message === undefined)) {
                throw new Error('None of the batch transactions could be loaded');
            }
            return results;
        }

        const vaultTransaction = await VaultTransaction.fromAccountAddress(connection, pubkey, 'confirmed');
        return [vaultMessageToVersionedMessage(vaultTransaction.message)];
    }, [account, url]);

    const {
        data: messages,
        error,
        isLoading,
    } = useSWR(['squads-proposal', account, url], fetcher, {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        suspense: false,
    });

    if (isLoading) {
        return <LoadingCard message="Loading Squads transaction..." />;
    }

    if (error || !messages || messages.length === 0) {
        return (
            <ErrorCard
                text={`Error loading Squads transaction: ${error?.message ?? 'no transactions found'}`}
                retry={onClear}
                retryText="Clear"
            />
        );
    }

    const activeIndex = Math.min(selected, messages.length - 1);
    const message = messages[activeIndex];

    return (
        <>
            {messages.length > 1 && (
                <Card ui="dashkit" className="mb-4">
                    <CardHeader ui="dashkit" className="flex-wrap gap-2">
                        <CardTitle as="h3" ui="dashkit">
                            Batch · {messages.length} transactions
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                            {messages.map((_unused, i) => (
                                <Button
                                    key={i}
                                    ui="dashkit"
                                    size="sm"
                                    variant={i === activeIndex ? 'primary' : 'white'}
                                    onClick={() => setSelected(i)}
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </div>
                    </CardHeader>
                </Card>
            )}
            {message ? (
                <LoadedView
                    transaction={{
                        message,
                        rawMessage: message.serialize(),
                        signatures: undefined,
                    }}
                    onClear={onClear}
                    showTokenBalanceChanges={false}
                />
            ) : (
                <ErrorCard text="This batch transaction is unavailable — its account may have been closed after execution." />
            )}
        </>
    );
}

export function TransactionInspectorPage({
    signature,
    showTokenBalanceChanges,
}: {
    signature?: string;
    showTokenBalanceChanges: boolean;
}) {
    const [inspectorData, setInspectorData] = React.useState<InspectorData>();
    const currentSearchParams = useSearchParams();
    const currentPathname = usePathname();
    const router = useRouter();
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const [paramString, setParamString] = React.useState<string>();

    // Sync message with url search params
    const prevInspectorData = usePrevious(inspectorData);
    React.useEffect(() => {
        if (signature) return;
        if (inspectorData && inspectorData !== prevInspectorData) {
            if (isSquadsProposalAccountData(inspectorData)) {
                // Only rewrite the URL when it doesn't already encode this squadsTx. Without this
                // guard, router.replace to an identical URL yields a fresh searchParams ref, which
                // re-runs the decode effect → setInspectorData(new object) → replace → infinite loop.
                // (Mirrors the guard the raw-message branch below already applies.)
                const alreadyInSync =
                    currentSearchParams?.get('squadsTx') === inspectorData.account &&
                    !currentSearchParams?.get('message') &&
                    !currentSearchParams?.get('signatures');
                if (!alreadyInSync) {
                    const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
                    nextQueryParams.set('squadsTx', inspectorData.account);
                    // Remove any other transaction params that might exist
                    nextQueryParams.delete('message');
                    nextQueryParams.delete('signatures');
                    router.replace(`${currentPathname}?${nextQueryParams.toString()}`);
                }
                return;
            }

            let nextQueryParams;

            if (inspectorData.signatures !== undefined) {
                const signaturesParam = encodeURIComponent(JSON.stringify(inspectorData.signatures));
                if (currentSearchParams.get('signatures') !== signaturesParam) {
                    nextQueryParams ||= new URLSearchParams(currentSearchParams?.toString());
                    nextQueryParams.set('signatures', signaturesParam);
                }
            }

            const base64 = toBase64(inspectorData.rawMessage);
            const newParam = encodeURIComponent(base64);
            if (currentSearchParams.get('message') !== newParam) {
                nextQueryParams ||= new URLSearchParams(currentSearchParams?.toString());
                nextQueryParams.set('message', newParam);
            }
            const queryString = nextQueryParams?.toString();
            if (queryString) {
                router.replace(`${currentPathname}?${queryString.toString()}`);
            }
        }
    }, [currentPathname, currentSearchParams, prevInspectorData, router, signature, inspectorData]);

    const resetParams = React.useCallback(() => {
        const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
        nextQueryParams.delete('message');
        nextQueryParams.delete('signatures');
        nextQueryParams.delete('squadsTx');
        const queryString = nextQueryParams?.toString();
        router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
    }, [currentPathname, currentSearchParams, router]);

    const resetToInspectorPage = React.useCallback(() => {
        router.push(inspectorPath);
    }, [inspectorPath, router]);

    // Decode the message url param whenever it changes
    React.useEffect(() => {
        const [result, nextParams, refreshUrl] = decodeUrlParams(new URLSearchParams(currentSearchParams?.toString()));
        if (refreshUrl) {
            const queryString = nextParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        }

        if (typeof result === 'string') {
            setParamString(result);
            setInspectorData(undefined);
        } else {
            setParamString(undefined);
            setInspectorData(result);
        }
    }, [currentPathname, currentSearchParams, router]);

    return (
        <PageContainer width="fluid" className="mt-6 [&_.border-dk-card-outline-dark]:border-outer-space-800">
            <header className="mb-3 mt-4 flex flex-col gap-1.5 py-6">
                <span className="text-xs font-normal uppercase text-muted">Transaction</span>
                <h1 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">Inspector</h1>
            </header>
            {signature ? (
                <PermalinkView
                    signature={signature}
                    reset={resetToInspectorPage}
                    showTokenBalanceChanges={showTokenBalanceChanges}
                />
            ) : inspectorData ? (
                isSquadsProposalAccountData(inspectorData) ? (
                    <SquadsProposalInspectorCard account={inspectorData.account} onClear={resetParams} />
                ) : (
                    <LoadedView
                        transaction={inspectorData}
                        onClear={resetParams}
                        showTokenBalanceChanges={showTokenBalanceChanges}
                    />
                )
            ) : (
                <RawInput value={paramString} setTransactionData={setInspectorData} />
            )}
        </PageContainer>
    );
}

export function PermalinkView({
    signature,
    reset,
    showTokenBalanceChanges,
}: {
    signature: string;
    reset: () => void;
    showTokenBalanceChanges: boolean;
}) {
    const details = useRawTransactionDetails(signature);
    const fetchTransaction = useFetchRawTransaction();
    const { status } = useCluster();
    const transaction = details?.data?.raw;

    // Fetch on load at 'confirmed' (matches providers/transactions/parsed.tsx) so freshly-confirmed txs resolve fast.
    const fetchConfirmedTx = React.useCallback(() => {
        fetchTransaction(signature, 'confirmed');
    }, [fetchTransaction, signature]);

    // Wait for the cluster to connect before fetching — otherwise the first render fetches against the
    // default (mainnet) URL before the ?cluster= param settles, wasting a request on the wrong cluster.
    React.useEffect(() => {
        if (!transaction && status === ClusterStatus.Connected) {
            fetchConfirmedTx();
        }
    }, [transaction, fetchConfirmedTx, status]);

    // The inspector renders a web3.js `VersionedMessage`; a v1 message gets there through a
    // bridged view over the wire bytes, which also carries the message's resource limits so
    // every entry path derives them from the same decode. The view is memoized because its
    // identity keys the downstream account-fetching effects and memos.
    const bridged = React.useMemo(() => {
        if (!transaction || transaction.message || transaction.version !== 1) {
            return undefined;
        }
        try {
            return bridgeV1MessageBytes(transaction.messageBytes);
        } catch {
            return undefined;
        }
    }, [transaction]);

    if (!details || details.status === FetchStatus.Fetching) {
        return <LoadingCard />;
    } else if (details.status === FetchStatus.FetchFailed) {
        return <ErrorCard retry={fetchConfirmedTx} text="Failed to fetch transaction" />;
    } else if (!transaction) {
        return <ErrorCard text="Transaction was not found" retry={reset} retryText="Reset" />;
    }

    const { message, messageBytes, signatures, meta } = transaction;
    const resolvedMessage = message ?? bridged?.message;
    if (!resolvedMessage) {
        return (
            <ErrorCard
                text={`The inspector does not support v${transaction.version} transactions`}
                retry={reset}
                retryText="Reset"
            />
        );
    }

    const tx: TransactionData = {
        accountBalances: meta,
        compiledInnerInstructions: meta?.innerInstructions,
        message: resolvedMessage,
        rawMessage: messageBytes,
        signatures,
        ...(bridged ? { transactionConfig: bridged.transactionConfig, version: 1 as const } : undefined),
    };
    return <LoadedView transaction={tx} onClear={reset} showTokenBalanceChanges={showTokenBalanceChanges} />;
}

// Tab bar sections. `path` doubles as the anchor id on the matching section wrapper, so scroll-spy can
// track it and clicking scrolls to it. `gated` tabs (the simulation-derived Logs / CU profiling) are
// shown disabled until a simulation has run. `merged` tabs collapse into the single "Programs & Logs" tab
// on the xxl two-column layout (mirrors the TX details page, which merges its Programs and Logs tabs when
// they sit side by side). SOL Balance Changes has no tab of its own — it is merged into the Accounts table
// as a "Change" column. The `tokens` tab (`requiresTokens`) is dropped until a simulation has produced
// token-balance changes, mirroring the TX details page which shows its Tokens tab only when the tx touched
// SPL tokens.
const BASE_TABS: {
    path: string;
    title: string;
    gated?: boolean;
    merged?: boolean;
    requiresSignatures?: boolean;
    requiresLookups?: boolean;
    requiresTokens?: boolean;
}[] = [
    { path: 'signatures', requiresSignatures: true, title: 'Signatures' },
    { path: 'accounts', title: 'Accounts' },
    { path: 'tokens', requiresTokens: true, title: 'Tokens' },
    { path: 'address-lookups', requiresLookups: true, title: 'Address Lookups' },
    { merged: true, path: 'programs', title: 'Programs' },
    { merged: true, path: 'simulation', title: 'Simulation' },
    { gated: true, merged: true, path: 'logs', title: 'Logs' },
    { gated: true, merged: true, path: 'cu-profiling', title: 'CU profiling' },
];

// The loaded-transaction view, shared by the permalink, parsed raw-input and Squads modes. It is arranged
// to MATCH THE TRANSACTION DETAILS PAGE (app/tx/[signature]/page-client.tsx): Overview (= Summary) → a
// scroll-spy tab bar → a full-width stack (Signatures, Accounts, Address Lookups) → a full-bleed
// two-column "Programs & Logs" row at xxl, with Instructions (Programs) on the left and the Simulation
// control + Logs + CU profiling in the sticky right column. Simulation state is owned here (not inside a
// section) so the tab bar can gate the simulation-derived tabs and the Account List's "Change" column and
// the right panel react to the same run.
function LoadedView({
    transaction,
    onClear,
    showTokenBalanceChanges,
}: {
    transaction: TransactionData;
    onClear: () => void;
    // SOL balance changes are surfaced inline in the Account List's "Change" column; token-balance changes
    // (only available once a simulation runs) render as a separate #tokens section when this is enabled,
    // mirroring the TX details page's Tokens card.
    showTokenBalanceChanges: boolean;
}) {
    const { message, rawMessage, signatures, accountBalances, compiledInnerInstructions, version, transactionConfig } =
        transaction;
    const { isXxl } = useBreakpoint();

    const fetchAccountInfo = useFetchAccountInfo();
    React.useEffect(() => {
        for (const lookup of message.addressTableLookups) {
            fetchAccountInfo(lookup.accountKey, 'parsed');
        }
    }, [message, fetchAccountInfo]);

    const simulation = useSimulation(message, accountBalances);
    const simDone = simulation.status === 'done';

    // Token-balance rows come from the simulation result, so they exist only after a successful run that
    // touched SPL tokens. Gated behind showTokenBalanceChanges (off for the Squads/permalink callers).
    const tokenBalanceRows = React.useMemo(() => {
        if (!showTokenBalanceChanges || simulation.status !== 'done') return undefined;
        const data = simulation.result.tokenBalanceData;
        if (!data) return undefined;
        return generateTokenBalanceRows(data.preTokenBalances, data.postTokenBalances, data.accountKeys);
    }, [showTokenBalanceChanges, simulation]);
    const hasTokens = Boolean(tokenBalanceRows?.length);

    const hasSignatures = Boolean(signatures);
    const hasLookups = message.addressTableLookups.length > 0;
    // Build the tab list. On xxl the Programs / Simulation / Logs / CU profiling tabs sit in the
    // side-by-side row, so they collapse into a single "Programs & Logs" tab (the `programs` anchor) and
    // the rest are dropped — exactly how the TX page merges Programs & Logs when side by side.
    const tabs = React.useMemo(() => {
        const visible = BASE_TABS.filter(
            t =>
                !(t.requiresSignatures && !hasSignatures) &&
                !(t.requiresLookups && !hasLookups) &&
                !(t.requiresTokens && !hasTokens),
        );
        const forXxl = visible
            .filter(t => !(t.merged && t.path !== 'programs'))
            .map(t => (t.path === 'programs' ? { ...t, title: 'Programs & Logs' } : t));
        return (isXxl ? forXxl : visible).map(t => ({
            disabled: Boolean(t.gated) && !simDone,
            path: t.path,
            title: t.title,
        }));
    }, [hasSignatures, hasLookups, hasTokens, isXxl, simDone]);

    return (
        <>
            <OverviewCard
                message={message}
                raw={rawMessage}
                onClear={onClear}
                isV1={version === 1}
                transactionConfig={transactionConfig}
            />
            <BaseNavigationTabs
                scrollSpy
                tabs={tabs}
                buildHref={path => `#${path}`}
                wrapperClassName="mt-3 bg-heavy-metal-900 lg:mt-0"
                className="gap-5"
                disabledHint="Run the simulation to load this tab's content."
            />
            <div className="mt-9 flex flex-col space-y-9 lg:mt-12 lg:space-y-12">
                {signatures && (
                    <div id="signatures">
                        <TransactionSignatures message={message} signatures={signatures} rawMessage={rawMessage} />
                    </div>
                )}
                {/* Account List with the SOL Balance Changes merged in as a "Change" column; the per-row
                    Simulate affordance drives the same simulation the panel below uses. */}
                <div id="accounts">
                    <AccountsCard message={message} simulation={simulation} />
                </div>
                {/* Token balance changes from the simulation. TokenBalancesCardInner brings its own
                    `#tokens` section anchor; it renders only once a run has produced token rows (matching
                    the gated Tokens tab above). */}
                {tokenBalanceRows && tokenBalanceRows.length > 0 && <TokenBalancesCardInner rows={tokenBalanceRows} />}
                {/* Renders (with its own `#address-lookups` anchor) only when the message references lookup
                    tables — otherwise it returns null, matching the gated tab above. A v1 message carries
                    static accounts only, so there are no lookups to render. */}
                {version !== 1 && <AddressTableLookupsCard message={message} />}
                {/* Programs & Logs — the two-column row copied from the TX details page. At xxl it goes
                    full-bleed to the viewport: Instructions (Programs) on the left, and the Simulation
                    control + Logs + CU profiling in the sticky right column. */}
                <div className="flex flex-col space-y-9 pb-10 xxl:relative xxl:left-1/2 xxl:w-screen xxl:-translate-x-1/2 xxl:flex-row xxl:items-start xxl:gap-6 xxl:space-y-0 xxl:px-6">
                    <div id="programs" className="xxl:min-w-0 xxl:flex-[1_1_0%] xxl:overflow-hidden">
                        <InstructionsSection message={message} compiledInnerInstructions={compiledInnerInstructions} />
                    </div>
                    <div className="scrollbar-hide xxl:sticky xxl:top-[70px] xxl:max-h-[calc(100vh-90px)] xxl:min-w-0 xxl:flex-[1_1_0%] xxl:overflow-y-auto xxl:rounded-b-lg">
                        <InspectorSimulationPanel simulation={simulation} message={message} />
                    </div>
                </div>
            </div>
        </>
    );
}

const DEFAULT_FEES = {
    lamportsPerSignature: 5000,
};

function OverviewCard({
    message,
    raw,
    onClear,
    signature,
    isV1,
    transactionConfig,
}: {
    message: VersionedMessage;
    raw: Uint8Array;
    onClear: () => void;
    signature?: string;
    isV1?: boolean;
    transactionConfig?: V1TransactionConfig;
}) {
    const fee = message.header.numRequiredSignatures * DEFAULT_FEES.lamportsPerSignature;
    const feePayerValidator = createFeePayerValidator(fee);

    // The v1 wire envelope has no signature-count byte — the count is read from the message header.
    const size = React.useMemo(() => {
        const sigBytes = (isV1 ? 0 : 1) + 64 * message.header.numRequiredSignatures;
        return sigBytes + raw.length;
    }, [message, raw, isV1]);
    const sizeLimit = isV1 ? V1_TRANSACTION_SIZE_LIMIT : PACKET_DATA_SIZE;

    // Heading + actions sit OUTSIDE the card (matching the TX details Summary card), then the label|value
    // rows inside a dashkit card.
    return (
        <section id="summary" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
                <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="sm" onClick={onClear}>
                        Clear
                    </Button>
                    <DownloadDropdown filename={signature || 'signature'} data={raw} />
                </div>
            </div>
            <Card ui="dashkit">
                <OverviewRow divider>
                    <OverviewLabel>Serialized Size / Limit</OverviewLabel>
                    <OverviewValue>
                        <span className={size > sizeLimit ? 'text-dk-warning-on-dark' : undefined}>
                            {size} / {sizeLimit} bytes
                        </span>
                    </OverviewValue>
                </OverviewRow>
                <OverviewRow divider>
                    <OverviewLabel>Fees</OverviewLabel>
                    <OverviewValue>
                        <SolBalance lamports={fee} />
                    </OverviewValue>
                </OverviewRow>
                {isV1 && (
                    <OverviewRow divider>
                        <OverviewLabel>Transaction Version</OverviewLabel>
                        <OverviewValue>
                            <span className="uppercase">v1</span>
                        </OverviewValue>
                    </OverviewRow>
                )}
                {transactionConfig?.computeUnitLimit !== undefined && (
                    <OverviewRow divider>
                        <OverviewLabel>Compute unit limit</OverviewLabel>
                        <OverviewValue>{transactionConfig.computeUnitLimit.toLocaleString('en-US')}</OverviewValue>
                    </OverviewRow>
                )}
                {transactionConfig?.priorityFeeLamports !== undefined && (
                    <OverviewRow divider>
                        <OverviewLabel>Priority fee (total)</OverviewLabel>
                        <OverviewValue>
                            <SolBalance lamports={transactionConfig.priorityFeeLamports} />
                        </OverviewValue>
                    </OverviewRow>
                )}
                {transactionConfig?.loadedAccountsDataSizeLimit !== undefined && (
                    <OverviewRow divider>
                        <OverviewLabel>Loaded accounts data size limit</OverviewLabel>
                        <OverviewValue>
                            {transactionConfig.loadedAccountsDataSizeLimit.toLocaleString('en-US')}
                        </OverviewValue>
                    </OverviewRow>
                )}
                {transactionConfig?.heapSize !== undefined && (
                    <OverviewRow divider>
                        <OverviewLabel>Heap size</OverviewLabel>
                        <OverviewValue>{transactionConfig.heapSize.toLocaleString('en-US')}</OverviewValue>
                    </OverviewRow>
                )}
                <OverviewRow>
                    <OverviewLabel>Fee payer</OverviewLabel>
                    <OverviewValue>
                        {message.staticAccountKeys.length === 0 ? (
                            'No Fee Payer'
                        ) : (
                            <AddressWithContext
                                pubkey={message.staticAccountKeys[0]}
                                validator={feePayerValidator}
                                align="left"
                                hideInfo
                                badges={
                                    <span className="mt-1 flex flex-wrap gap-1.5">
                                        <Badge ui="dashkit" variant="info">
                                            Signer
                                        </Badge>
                                        <Badge ui="dashkit" variant="destructive">
                                            Writable
                                        </Badge>
                                    </span>
                                }
                            />
                        )}
                    </OverviewValue>
                </OverviewRow>
            </Card>
        </section>
    );
}

// Mirrors the Summary card rows on the transaction details page (features/transaction/ui/SummaryCard): a
// label | value grid with 12px horizontal / 10px vertical padding and top-aligned content.
function OverviewRow({ children, divider }: { children: React.ReactNode; divider?: boolean }) {
    return (
        <div
            className={cn(
                'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-start gap-2 px-3 py-2.5',
                divider && 'border-1 border-b border-white/10 [border-bottom-style:solid]',
            )}
        >
            {children}
        </div>
    );
}

function OverviewLabel({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-wrap items-center gap-1 text-sm text-outer-space-300">{children}</div>;
}

function OverviewValue({ children }: { children: React.ReactNode }) {
    return <div className="break-all text-sm text-white">{children}</div>;
}
