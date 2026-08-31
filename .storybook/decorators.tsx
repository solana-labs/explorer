import { toConnectableUrl } from '@entities/cluster';
import { TxInstructionSurface } from '@entities/instruction-card';
import { DispatchContext, FetchersContext, type State, StateContext } from '@providers/accounts';
import type { ClusterState } from '@providers/cluster';
import { ScrollAnchorProvider } from '@providers/scroll-anchor';
import { TransactionsProvider } from '@providers/transactions';
import { type Cluster, clusterSelection, clusterUrl } from '@utils/cluster';
import React, { useLayoutEffect, useRef } from 'react';
import { fn } from 'storybook/test';

import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { MockAccountsProvider } from './__mocks__/MockAccountsProvider';
import { MockClusterProvider as ClusterProvider } from './__mocks__/MockClusterProvider';
import { MockHistoryProvider } from './__mocks__/MockHistoryProvider';
import { MockStatsProvider } from './__mocks__/MockStatsProvider';
import { MockTokenInfoBatchProvider } from './__mocks__/MockTokenInfoBatchProvider';
import { MockTransactionsProvider } from './__mocks__/MockTransactionsProvider';
import type { Decorator, Parameters } from './types';

const noopFetcher = async () => undefined;
// MultipleAccountFetcher has private constructor params (nominal-typed) — no structural object matches.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- decorator-only stub
const noopAccountsFetchers = {
    parsed: { fetch: noopFetcher },
    raw: { fetch: noopFetcher },
    skip: { fetch: noopFetcher },
} as unknown as React.ContextType<typeof FetchersContext>;

/** Wraps stories with ClusterProvider. Usage: `decorators: [withCluster]` */
export const withCluster: Decorator = Story => (
    <ClusterProvider>
        <Story />
    </ClusterProvider>
);

/** Wraps stories with ClusterProvider where the cluster modal is forced open. Usage: `decorators: [withClusterModalOpen]` */
export const withClusterModalOpen: Decorator = Story => (
    <ClusterProvider modalOpen>
        <Story />
    </ClusterProvider>
);

/**
 * Factory: seeds ClusterProvider with an explicit cluster `state` (cluster, customUrl, status) so consumers of
 * `useCluster()` render a specific cluster/status. Usage: `decorators: [withClusterState({ cluster, customUrl, status })]`
 *
 * `cluster` and `customUrl` are paired into a `ClusterSelection` here, so stories keep writing literals.
 * A Custom story whose URL is not an http(s) endpoint throws: it describes a state `useCluster()` can
 * never report.
 *
 * `modalOpen` seeds the cluster-modal atom, like `withClusterModalOpen`. A story that brings its own jotai
 * store needs it here instead: the atom is seeded into whichever store is in scope where the provider
 * sits, and `withClusterModalOpen` sits outside the story's own store.
 */
export function withClusterState({
    cluster,
    customUrl,
    modalOpen,
    ...state
}: Omit<ClusterState, 'connectableUrl' | 'selection'> & {
    cluster: Cluster;
    customUrl?: string;
    modalOpen?: boolean;
}): Decorator {
    return function WithClusterState(Story) {
        // Derived here rather than asked of the story: a state describing a settled cluster has an endpoint
        // to connect to, and leaving it out is what makes a hook keyed on it wait for good.
        const selection = clusterSelection(cluster, customUrl);
        return (
            <ClusterProvider
                modalOpen={modalOpen}
                state={{ ...state, connectableUrl: toConnectableUrl(clusterUrl(selection)), selection }}
            >
                <Story />
            </ClusterProvider>
        );
    };
}

/** Wraps stories with the real ScrollAnchorProvider. Usage: `decorators: [withScrollAnchor]` */
export const withScrollAnchor: Decorator = Story => (
    <ScrollAnchorProvider>
        <Story />
    </ScrollAnchorProvider>
);

/** Declares the tx-page instruction surface every migrated card reads. Usage: `decorators: [withTxInstructionSurface]` */
export const withTxInstructionSurface: Decorator = Story => (
    // eslint-disable-next-line unicorn/no-null -- SignatureResult.err is `TransactionError | null`
    <TxInstructionSurface result={{ err: null }}>
        <Story />
    </TxInstructionSurface>
);

/** Wraps stories with ClusterProvider and MockAccountsProvider. Usage: `decorators: [withClusterAndAccounts]` */
export const withClusterAndAccounts: Decorator = Story => (
    <ClusterProvider>
        <MockAccountsProvider>
            <Story />
        </MockAccountsProvider>
    </ClusterProvider>
);

/**
 * Factory: seeds the real accounts contexts with a fixture `State` so consumers of `useAccountInfo`
 * etc. resolve against the provided cache. Fetchers no-op (no RPC calls).
 * Usage: `decorators: [withAccountsState(stateWithFixture)]`
 */
export function withAccountsState(state: State): Decorator {
    return function WithAccountsState(Story) {
        return (
            <ClusterProvider>
                <StateContext.Provider value={state}>
                    <DispatchContext.Provider value={() => undefined}>
                        <FetchersContext.Provider value={noopAccountsFetchers}>
                            <Story />
                        </FetchersContext.Provider>
                    </DispatchContext.Provider>
                </StateContext.Provider>
            </ClusterProvider>
        );
    };
}

/** Decorator for card table field components. Usage: `decorators: [withCardTableField]` */
export const withCardTableField: Decorator = Story => (
    <ClusterProvider>
        <MockAccountsProvider>
            <Card ui="dashkit">
                <BaseTable ui="dashkit" variant="card" nowrap className="[&>tbody>tr:first-child>td]:!border-t-0">
                    <BaseTable.Body>
                        <Story />
                    </BaseTable.Body>
                </BaseTable>
            </Card>
        </MockAccountsProvider>
    </ClusterProvider>
);

/** Wraps stories with ClusterProvider, TransactionsProvider, and MockAccountsProvider. Usage: `decorators: [withTransactions]` */
export const withTransactions: Decorator = Story => (
    <ClusterProvider>
        <TransactionsProvider>
            <MockAccountsProvider>
                <Story />
            </MockAccountsProvider>
        </TransactionsProvider>
    </ClusterProvider>
);

/** Wraps stories with MockTokenInfoBatchProvider. Usage: `decorators: [withTokenInfoBatch]` */
export const withTokenInfoBatch: Decorator = Story => (
    <MockTokenInfoBatchProvider>
        <Story />
    </MockTokenInfoBatchProvider>
);

/** Wraps stories with ClusterProvider, MockTokenInfoBatchProvider, and MockAccountsProvider. Usage: `decorators: [withClusterAccountsAndTokenInfo]` */
export const withClusterAccountsAndTokenInfo: Decorator = Story => (
    <ClusterProvider>
        <MockTokenInfoBatchProvider>
            <MockAccountsProvider>
                <Story />
            </MockAccountsProvider>
        </MockTokenInfoBatchProvider>
    </ClusterProvider>
);

/** Wraps stories with ClusterProvider and MockStatsProvider. Usage: `decorators: [withStats]` */
export const withStats: Decorator = Story => (
    <ClusterProvider>
        <MockStatsProvider>
            <Story />
        </MockStatsProvider>
    </ClusterProvider>
);

/**
 * Wraps stories with ClusterProvider, MockTransactionsProvider, and MockAccountsProvider.
 * Replaces the production TransactionsProvider so consumers don't fire RPC calls.
 * Seeds the accounts cache from `parameters.accounts` (built-in program accounts only when omitted).
 * Usage: `decorators: [withMockTransactions]`, optionally `parameters: { accounts: {...} }`
 */
export const withMockTransactions: Decorator = (Story, context) => (
    <ClusterProvider>
        <MockTransactionsProvider>
            <MockAccountsProvider accounts={context.parameters.accounts}>
                <Story />
            </MockAccountsProvider>
        </MockTransactionsProvider>
    </ClusterProvider>
);

/**
 * Wraps stories with ClusterProvider, MockAccountsProvider, and MockHistoryProvider.
 * Seeds the history cache from `parameters.history` (empty cache when omitted).
 * Usage: `decorators: [withHistory]`, optionally `parameters: { history: {...} }`
 */
export const withHistory: Decorator = (Story, context) => (
    <ClusterProvider>
        <MockAccountsProvider>
            <MockHistoryProvider history={context.parameters.history}>
                <Story />
            </MockHistoryProvider>
        </MockAccountsProvider>
    </ClusterProvider>
);

type NextjsNavigationOptions = {
    pathname?: string;
    query?: Record<string, string>;
};

/** Creates parameters for components using Next.js navigation */
export const createNextjsParameters = (options?: NextjsNavigationOptions): Parameters => ({
    nextjs: {
        appDirectory: true,
        navigation: {
            pathname: options?.pathname ?? '/',
            query: options?.query ?? {},
        },
    },
});

export const nextjsParameters: Parameters = createNextjsParameters();

/** Mocks navigator.clipboard.writeText for stories that copy text. Usage: `decorators: [withClipboardMock]` */
export const withClipboardMock: Decorator = Story => {
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: fn().mockResolvedValue(undefined) },
    });

    return <Story />;
};

const MCP_PONG = { id: 1, jsonrpc: '2.0', result: { content: [{ text: 'pong', type: 'text' }] } };

// Patched during render so the swap lands before any child effect fires, and restored on unmount so the
// stub cannot leak into another story sharing this browser context.
function McpHealthyBoundary({ children }: { children: React.ReactNode }) {
    const original = useRef(globalThis.fetch);

    if (globalThis.fetch === original.current) {
        globalThis.fetch = fn(() => Promise.resolve(Response.json(MCP_PONG)));
    }
    useLayoutEffect(() => {
        const restore = original.current;
        return () => {
            globalThis.fetch = restore;
        };
    }, []);

    return <>{children}</>;
}

/**
 * Answers the /mcp health probe with a pong so the status badge settles on "Ready".
 * Without it the badge races from "Checking" to "Unreachable" mid-screenshot.
 */
export const withMcpHealthy: Decorator = Story => (
    <McpHealthyBoundary>
        <Story />
    </McpHealthyBoundary>
);

/** Errored variant — writeText rejects so consumers flip to 'errored' state. */
export const withClipboardMockErrored: Decorator = Story => {
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: fn().mockRejectedValue(new Error('mock clipboard write failed')) },
    });

    return <Story />;
};

// Cancels the load and pins `complete` to false on the first <img> it wraps, so
// it stays in its pending state. Scoped to that one element — no global patching,
// so it's safe in the combined Docs view where stories share a page.
function ImageLoadPendingBoundary({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const img = ref.current?.querySelector('img');
        if (!img) return;
        Object.defineProperty(img, 'complete', { configurable: true, get: () => false });
        img.removeAttribute('src');
    }, []);

    return <div ref={ref}>{children}</div>;
}

/**
 * Holds the story's first <img> in its pending state so a loading placeholder or
 * skeleton is the visible, documentable state — without it a bundled image
 * resolves instantly and the placeholder is gone before it can be seen.
 * Usage: `decorators: [withImageLoadPending]`
 */
export const withImageLoadPending: Decorator = Story => (
    <ImageLoadPendingBoundary>
        <Story />
    </ImageLoadPendingBoundary>
);

// Blurs focus grabbed during mount, scoped to its own subtree — click-to-focus still
// works and other stories on the shared Docs page are unaffected.
function AutoFocusReleaseBoundary({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const frame = requestAnimationFrame(() => {
            const active = document.activeElement;
            if (active instanceof HTMLElement && ref.current?.contains(active)) active.blur();
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    return <div ref={ref}>{children}</div>;
}

/**
 * Keeps Storybook keyboard navigation working for stories whose component autofocuses
 * on mount (e.g. NicknameEditor's input) — the stolen focus is released after render.
 * Usage: `decorators: [withAutoFocusReleased]`
 */
export const withAutoFocusReleased: Decorator = Story => (
    <AutoFocusReleaseBoundary>
        <Story />
    </AutoFocusReleaseBoundary>
);
