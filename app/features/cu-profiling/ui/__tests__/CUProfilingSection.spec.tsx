import { getBase58Decoder } from '@solana/kit';
import {
    ComputeBudgetProgram,
    type ParsedInstruction,
    type ParsedTransactionWithMeta,
    type PartiallyDecodedInstruction,
    PublicKey,
} from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Chart.js needs a canvas that jsdom does not have; the legend is plain DOM, which is where names show.
const { Bar, useTransactionDetails, useProgramIdlNames, useEpochScheduleResult, warn } = vi.hoisted(() => ({
    Bar: vi.fn(() => null),
    useEpochScheduleResult: vi.fn(),
    useProgramIdlNames: vi.fn(),
    useTransactionDetails: vi.fn(),
    warn: vi.fn(),
}));
vi.mock('react-chartjs-2', () => ({ Bar }));
vi.mock('@providers/transactions', () => ({ useTransactionDetails }));
// The `@x` path: `useResolvedInstructionNames` reaches the fetch through the cross-entity API.
vi.mock('@entities/idl/@x/transaction-data', () => ({ useProgramIdlNames }));
vi.mock('@/app/shared/lib/logger', () => ({ Logger: { error: vi.fn(), warn } }));
vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ cluster: Cluster.MainnetBeta, url: MAINNET_URL }),
    useEpochScheduleResult,
}));

const EPOCH_SCHEDULE = { firstNormalEpoch: 0n, firstNormalSlot: 0n, slotsPerEpoch: 432000n };

// The schedule has landed unless a test says otherwise.
beforeEach(() =>
    useEpochScheduleResult.mockReturnValue({
        data: EPOCH_SCHEDULE,
        error: undefined,
        isLoading: false,
    }),
);

import { CUProfilingSection } from '../CUProfilingSection';

const BASE58_DECODER = getBase58Decoder();

const MAINNET_URL = 'https://api.mainnet-beta.solana.com';
// A real mainnet slot. Slot 0 would be falsy and short-circuit the component's own guard.
const SLOT = 438628608;
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const JUPITER_PROGRAM = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');

afterEach(() => vi.clearAllMocks());

describe('CUProfilingSection', () => {
    describe('names resolvable without an IDL', () => {
        it('should name an RPC-parsed instruction from its type', () => {
            mockTransaction([transferChecked()], [invocation(TOKEN_PROGRAM, 105)]);

            renderSection();

            expect(screen.getByText('#1 Transfer Checked: 105')).toBeInTheDocument();
        });

        // Compute Budget ships no IDL and the RPC does not parse it, so it is named from its
        // discriminator. It also must not be dropped: the history summaries filter it out, but doing so
        // here would shift every later name onto the wrong instruction's CU figure.
        it('should name Compute Budget instructions in place, keeping later names aligned', () => {
            mockTransaction(
                [setComputeUnitPrice(), transferChecked()],
                [invocation(ComputeBudgetProgram.programId), invocation(TOKEN_PROGRAM, 105)],
            );

            renderSection();

            expect(screen.getByText('#1 Set Compute Unit Price: 150')).toBeInTheDocument();
            expect(screen.getByText('#2 Transfer Checked: 105')).toBeInTheDocument();
        });
    });

    describe('names resolvable only from an IDL', () => {
        it('should name an instruction once its program IDL resolves', () => {
            mockTransaction([jupiterRoute()], [invocation(JUPITER_PROGRAM, 159483)]);
            useProgramIdlNames.mockReturnValue(
                new Map([
                    [JUPITER_PROGRAM.toBase58(), { programName: 'Jupiter', resolveInstructionName: () => 'Route V2' }],
                ]),
            );

            renderSection();

            expect(screen.getByText('#1 Route V2: 159,483')).toBeInTheDocument();
        });

        it('should look up every unnamed program, leaving the fetch filter to the IDL hook', () => {
            mockTransaction(
                [setComputeUnitPrice(), jupiterRoute()],
                [invocation(ComputeBudgetProgram.programId), invocation(JUPITER_PROGRAM, 159483)],
            );

            renderSection();

            // NAME_SOURCES runs after this list is built, so Compute Budget is looked up too;
            // `NON_ANCHOR_PROGRAMS` is what stops it becoming a fetch.
            expect(useProgramIdlNames).toHaveBeenCalledWith(
                [ComputeBudgetProgram.programId.toBase58(), JUPITER_PROGRAM.toBase58()],
                Cluster.MainnetBeta,
                MAINNET_URL,
            );
        });

        it('should fall back to the position while the IDL fetch is in flight', () => {
            mockTransaction([jupiterRoute()], [invocation(JUPITER_PROGRAM, 159483)]);
            useProgramIdlNames.mockReturnValue(new Map());

            renderSection();

            expect(screen.getByText('#1 Unknown Instruction: 159,483')).toBeInTheDocument();
        });
    });

    describe('negative cases', () => {
        it('should render nothing before the transaction loads', () => {
            useTransactionDetails.mockReturnValue(undefined);

            const { container } = renderSection();

            expect(container).toBeEmptyDOMElement();
        });

        it('should render nothing for a transaction with no logs', () => {
            mockTransaction([transferChecked()], []);

            const { container } = renderSection();

            expect(container).toBeEmptyDOMElement();
        });
    });

    /**
     * The epoch schedule sets the CU reserve, so no schedule means no card. An empty card body is what
     * the user would otherwise get with no explanation, and only the error tells "failed" apart from
     * "still loading" — `useEpochSchedule` returns undefined for both.
     */
    describe('when the epoch schedule cannot be loaded', () => {
        beforeEach(() => {
            useEpochScheduleResult.mockReturnValue({
                data: undefined,
                error: new Error('rpc unavailable'),
                isLoading: false,
            });
        });

        it('should say why CU profiling is unavailable instead of vanishing', () => {
            mockTransaction([transferChecked()], [invocation(TOKEN_PROGRAM, 105)]);

            renderSection();

            expect(screen.getByText('Unavailable: the epoch schedule could not be loaded.')).toBeInTheDocument();
        });

        // SWR keeps a cached value beside a later error.
        it('should still render the chart when a cached schedule is available', () => {
            useEpochScheduleResult.mockReturnValue({
                data: EPOCH_SCHEDULE,
                error: new Error('rpc unavailable'),
                isLoading: false,
            });
            mockTransaction([transferChecked()], [invocation(TOKEN_PROGRAM, 105)]);

            renderSection();

            expect(screen.getByText('#1 Transfer Checked: 105')).toBeInTheDocument();
            expect(screen.queryByText('Unavailable: the epoch schedule could not be loaded.')).not.toBeInTheDocument();
        });

        it('should report the failure to Sentry with the reason attached', () => {
            mockTransaction([transferChecked()], [invocation(TOKEN_PROGRAM, 105)]);

            renderSection();

            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining('epoch schedule unavailable'),
                expect.objectContaining({
                    sentry: true,
                    sentryExtras: expect.objectContaining({ reason: expect.stringContaining('rpc unavailable') }),
                }),
            );
        });

        // Still nothing to show when the transaction logged nothing: the section is not this user's
        // concern at all, so the degraded card would be noise.
        it('should still render nothing when the transaction has no logs', () => {
            mockTransaction([transferChecked()], []);

            const { container } = renderSection();

            expect(container).toBeEmptyDOMElement();
        });
    });

    // The ordinary first render, before the schedule arrives. No card and no report — nothing has failed.
    it('should render nothing and report nothing while the schedule is still loading', () => {
        useEpochScheduleResult.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
        mockTransaction([transferChecked()], [invocation(TOKEN_PROGRAM, 105)]);

        const { container } = renderSection();

        expect(container).toBeEmptyDOMElement();
        expect(warn).not.toHaveBeenCalled();
    });
});

function renderSection() {
    return render(<CUProfilingSection signature="sig" />);
}

function mockTransaction(
    instructions: (ParsedInstruction | PartiallyDecodedInstruction)[],
    logLines: string[][],
): void {
    useProgramIdlNames.mockReturnValue(new Map());
    const transactionWithMeta = {
        meta: { computeUnitsConsumed: 405, err: null, logMessages: logLines.flat() },
        slot: SLOT,
        transaction: { message: { accountKeys: [], instructions } },
    } as unknown as ParsedTransactionWithMeta;
    useTransactionDetails.mockReturnValue({ data: { transactionWithMeta } });
}

/**
 * The raw RPC log lines for one top-level invocation. `parseProgramLogs` reads these; passing the
 * rendered text it produces instead would leave every instruction at zero CU.
 * Compute Budget logs no "consumed" line, so omit the units to reproduce that.
 */
function invocation(programId: PublicKey, computeUnits?: number): string[] {
    const id = programId.toBase58();
    return [
        `Program ${id} invoke [1]`,
        ...(computeUnits === undefined ? [] : [`Program ${id} consumed ${computeUnits} of 200000 compute units`]),
        `Program ${id} success`,
    ];
}

function transferChecked(): ParsedInstruction {
    return {
        parsed: { info: {}, type: 'transferChecked' },
        program: 'spl-token',
        programId: TOKEN_PROGRAM,
    } as unknown as ParsedInstruction;
}

function setComputeUnitPrice(): PartiallyDecodedInstruction {
    return {
        accounts: [],
        data: BASE58_DECODER.decode(new Uint8Array([3, 0x90, 0x06, 0, 0, 0, 0, 0, 0])),
        programId: ComputeBudgetProgram.programId,
    };
}

function jupiterRoute(): PartiallyDecodedInstruction {
    return {
        accounts: [],
        data: BASE58_DECODER.decode(new Uint8Array([229, 23, 203, 151, 122, 227, 173, 42])),
        programId: JUPITER_PROGRAM,
    };
}
