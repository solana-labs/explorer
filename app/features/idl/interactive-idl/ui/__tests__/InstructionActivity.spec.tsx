/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
    BroadcastFailedResult,
    ExecutionOkResult,
    PreBroadcastFailedResult,
    RpcSimulationFailedResult,
    SimulationExecutionFailedResult,
    SimulationOkResult,
} from '../../model/transaction/types';
import { InstructionExecutionActivity, InstructionSimulationActivity } from '../InstructionActivity';

// jsdom doesn't implement ResizeObserver, which Radix primitives (Tabs) touch.
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
}

vi.mock('@entities/cluster', () => ({
    useExplorerLink: (path: string) => ({ link: `https://example.test${path}` }),
}));

const SIGNATURE = 'sig_abc123';
const SERIALIZED = '//79/A==';
const ENCODED = '__79_A';
const FINISHED_AT = new Date('2026-01-01T00:00:00Z');
const NO_LOGS = { parsed: [], raw: [] };

describe('InstructionExecutionActivity', () => {
    it('should not render a status header when lastResult is undefined', () => {
        render(<InstructionExecutionActivity />);

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByText(SIGNATURE)).toBeNull();
    });

    it('should render Success status with tx link on successful execution', () => {
        const lastResult: ExecutionOkResult = {
            finishedAt: FINISHED_AT,
            kind: 'execution',
            logs: NO_LOGS,
            signature: SIGNATURE,
            status: 'success',
        };

        render(<InstructionExecutionActivity lastResult={lastResult} />);

        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText(SIGNATURE)).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', `https://example.test/tx/${SIGNATURE}`);
    });

    it('should render Error status with tx link on broadcast_failed', () => {
        const lastResult: BroadcastFailedResult = {
            finishedAt: FINISHED_AT,
            kind: 'execution',
            logs: NO_LOGS,
            message: 'on-chain failure',
            phase: 'broadcast_failed',
            serializedTxMessage: SERIALIZED,
            signature: SIGNATURE,
            status: 'error',
        };

        render(<InstructionExecutionActivity lastResult={lastResult} />);

        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(SIGNATURE)).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', `https://example.test/tx/${SIGNATURE}`);
    });

    it('should render error message with inspector link on pre_broadcast_failed with serialized tx', () => {
        const lastResult: PreBroadcastFailedResult = {
            finishedAt: FINISHED_AT,
            kind: 'execution',
            logs: NO_LOGS,
            message: 'wallet rejected',
            phase: 'pre_broadcast_failed',
            serializedTxMessage: SERIALIZED,
            status: 'error',
        };

        render(<InstructionExecutionActivity lastResult={lastResult} />);

        expect(screen.getByText('wallet rejected')).toBeInTheDocument();
        expect(screen.queryByText(SIGNATURE)).toBeNull();
        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            `https://example.test/tx/inspector?message=${ENCODED}`,
        );
    });

    it('should render error message without link on pre_broadcast_failed without serialized tx', () => {
        const lastResult: PreBroadcastFailedResult = {
            finishedAt: FINISHED_AT,
            kind: 'execution',
            logs: NO_LOGS,
            message: 'build error',
            phase: 'pre_broadcast_failed',
            serializedTxMessage: undefined,
            status: 'error',
        };

        render(<InstructionExecutionActivity lastResult={lastResult} />);

        expect(screen.getByText('build error')).toBeInTheDocument();
        expect(screen.queryByRole('link')).toBeNull();
    });
});

describe('InstructionSimulationActivity', () => {
    it('should not render a status header when lastSimulation is undefined', () => {
        render(<InstructionSimulationActivity />);

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByText(/simulated/i)).toBeNull();
    });

    it('should render Simulated status with compute units and inspector link on success', () => {
        const lastSimulation: SimulationOkResult = {
            finishedAt: FINISHED_AT,
            kind: 'simulation',
            logs: NO_LOGS,
            returnData: undefined,
            serializedTxMessage: SERIALIZED,
            status: 'success',
            unitsConsumed: 12345,
        };

        render(<InstructionSimulationActivity lastSimulation={lastSimulation} />);

        expect(screen.getByText('Simulated')).toBeInTheDocument();
        expect(screen.getByText(/12,345 CU/)).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            `https://example.test/tx/inspector?message=${ENCODED}`,
        );
    });

    it('should render Simulation Error with inspector link on rpc_simulation_failed', () => {
        const lastSimulation: RpcSimulationFailedResult = {
            finishedAt: FINISHED_AT,
            kind: 'simulation',
            logs: NO_LOGS,
            message: 'chain rejected',
            phase: 'rpc_simulation_failed',
            serializedTxMessage: SERIALIZED,
            status: 'error',
        };

        render(<InstructionSimulationActivity lastSimulation={lastSimulation} />);

        expect(screen.getByText('Simulation Error')).toBeInTheDocument();
        expect(screen.getByText('chain rejected')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            `https://example.test/tx/inspector?message=${ENCODED}`,
        );
    });

    it('should render Simulation Error without link on simulation_execution_failed without serialized tx', () => {
        const lastSimulation: SimulationExecutionFailedResult = {
            finishedAt: FINISHED_AT,
            kind: 'simulation',
            message: 'local error',
            phase: 'simulation_execution_failed',
            serializedTxMessage: undefined,
            status: 'error',
        };

        render(<InstructionSimulationActivity lastSimulation={lastSimulation} />);

        expect(screen.getByText('Simulation Error')).toBeInTheDocument();
        expect(screen.getByText('local error')).toBeInTheDocument();
        expect(screen.queryByRole('link')).toBeNull();
    });
});
