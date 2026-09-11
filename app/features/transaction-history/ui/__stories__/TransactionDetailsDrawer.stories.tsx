import { MockClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockTransactionsProvider } from '@storybook-config/__mocks__/MockTransactionsProvider';
import { nextjsParameters } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import { fn } from 'storybook/test';

import type { CacheEntry } from '@/app/providers/cache';
import { FetchStatus } from '@/app/providers/cache';
import type { Details } from '@/app/providers/transactions/raw';

import { TransactionDetailsDrawer } from '../TransactionDetailsDrawer';

const SIGNATURE = '2JgaFoExampleDetailsDrawerSignaturePlaceholderForStoriesZBbGUabcdefghijkmnopqrstuv';
const SLOT = 312_456_789;
const BLOCK_TIME = 1_718_000_000;

// Representative wire bytes so the raw-data field shows a byte count and enables copy/download.
const MESSAGE_BYTES = new Uint8Array(Array.from({ length: 215 }, (_, i) => i % 256));

// A fully fetched raw transaction. Only `messageBytes` is read by the drawer; the version-1 variant
// is the cheapest valid `RawTransaction` (no web3.js message/transaction views required).
const FETCHED: CacheEntry<Details> = {
    data: {
        raw: {
            messageBytes: MESSAGE_BYTES,
            serializedSize: MESSAGE_BYTES.length + 64,
            signatures: [SIGNATURE],
            version: 1,
        },
    },
    status: FetchStatus.Fetched,
};

/**
 * Wraps the drawer in the cluster + transactions providers it reads from. Seeds the raw-details cache
 * from `parameters.raw` (keyed by signature) so `useRawTransactionDetails` resolves without RPC.
 */
const withDrawerProviders: Decorator = (Story, context) => (
    <MockClusterProvider>
        <MockTransactionsProvider raw={context.parameters.raw}>
            <Story />
        </MockTransactionsProvider>
    </MockClusterProvider>
);

const meta = {
    args: {
        blockTime: BLOCK_TIME,
        instructionNames: [
            { name: 'Transfer', programName: 'System' },
            { name: 'CreateAccount', programName: 'System' },
        ],
        onOpenChange: fn(),
        open: true,
        signature: SIGNATURE,
        slot: SLOT,
        statusLabel: 'Success',
        statusVariant: 'success',
    },
    component: TransactionDetailsDrawer,
    decorators: [withDrawerProviders],
    parameters: {
        ...nextjsParameters,
        raw: { [SIGNATURE]: FETCHED },
        viewport: { defaultViewport: 'mobile1' },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/TransactionHistory/TransactionDetailsDrawer@Media',
} satisfies Meta<typeof TransactionDetailsDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Fully loaded: timestamp, block link, program list, and raw-data size.
export const Default: Story = {};

// A failed transaction shows the warning badge.
export const Failed: Story = {
    args: {
        instructionNames: [{ name: 'Transfer', programName: 'System' }],
        statusLabel: 'Failed',
        statusVariant: 'warning',
    },
};

// No cache entry yet → the program list shows its skeleton and the raw-data field shows its loader.
export const Loading: Story = {
    args: { instructionNames: undefined },
    parameters: { raw: {} },
};

// Fetched but no block time and no instructions → Time row is hidden and Programs shows "---".
export const Unavailable: Story = {
    args: { blockTime: null, instructionNames: [] },
    parameters: { raw: { [SIGNATURE]: { data: { raw: null }, status: FetchStatus.Fetched } } },
};
