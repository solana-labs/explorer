import type * as SolanaKit from '@solana/kit';
import { vi } from 'vitest';

import type * as TokenInfoBatchProvider from '@/app/entities/token-info/model/token-info-batch-provider';

import { mockSolanaRpc } from './app/__tests__/mock-rpc';

// Global no-op mock for Logger to suppress console output in all tests.
vi.mock('@/app/shared/lib/logger', () => ({
    Logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), panic: vi.fn(), warn: vi.fn() },
}));

// Global no-op mock for Sentry to avoid @sentry/nextjs import issues in tests.
vi.mock('@/app/shared/lib/sentry', () => ({
    SentryErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
    captureFeedback: vi.fn(() => 'test-event-id'),
    withScope: vi.fn(callback => callback({})),
    withTraceData: vi.fn(() => ({})),
}));

// Client-only Sentry surface gets its own module id, so the mock above does not cover it.
vi.mock('@/app/shared/lib/sentry/client', () => ({
    sendFeedback: vi.fn(async () => 'test-event-id'),
}));

// Global no-op mock for TokenInfoBatchProvider to prevent network requests in all tests.
// Tests that need to assert on batch behavior should override with a local vi.mock().
vi.mock('@/app/entities/token-info/model/token-info-batch-provider', async () => {
    const actual = await vi.importActual<typeof TokenInfoBatchProvider>(
        '@/app/entities/token-info/model/token-info-batch-provider',
    );

    return {
        ...actual,
        useTokenInfoBatch: () => () => {},
    };
});

// Global mock for @solana/kit to prevent real RPC calls (429s) in tests.
// Tests that need custom RPC behavior should override with a local vi.mock().
vi.mock('@solana/kit', async () => {
    const actual = await vi.importActual<typeof SolanaKit>('@solana/kit');
    return {
        ...actual,
        createSolanaRpc: vi.fn(() => mockSolanaRpc()),
    };
});
