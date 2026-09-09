import { gen } from '@__fixtures__/gen';
import { Cluster } from '@utils/cluster';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchBlock, FetchStatus } from '../block';

const MOCK_URL = 'https://api.mainnet-beta.solana.com';
const SLOT = 100;
const PARENT_SLOT = 99;

const getBlocks = vi.fn();
const getSlotLeaders = vi.fn();
const getRpc = vi.fn((_url: string) => ({
    getBlocks: (...args: unknown[]) => ({ send: () => getBlocks(...args) }),
    getSlotLeaders: (...args: unknown[]) => ({ send: () => getSlotLeaders(...args) }),
}));

vi.mock('@entities/cluster', async importOriginal => ({
    ...((await importOriginal()) as Record<string, unknown>),
    getRpc: (...args: [string]) => getRpc(...args),
}));

const fetchBlockBySlot = vi.fn();
vi.mock('@entities/block-data', () => ({
    fetchBlock: (...args: unknown[]) => fetchBlockBySlot(...args),
}));

vi.mock('@/app/shared/lib/logger', () => ({ Logger: { error: vi.fn() } }));

const LEADERS = [gen.address(1), gen.address(2), gen.address(3)];

const dispatch = vi.fn();

function lastUpdate() {
    const calls = dispatch.mock.calls;
    return calls[calls.length - 1][0] as {
        data?: {
            blockLeader?: string;
            childLeader?: string;
            childSlot?: bigint;
            parentLeader?: string;
        };
        status: FetchStatus;
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    getRpc.mockReturnValue({
        getBlocks: (...args: unknown[]) => ({ send: () => getBlocks(...args) }),
        getSlotLeaders: (...args: unknown[]) => ({ send: () => getSlotLeaders(...args) }),
    });
    fetchBlockBySlot.mockResolvedValue({ parentSlot: BigInt(PARENT_SLOT) });
});

describe('fetchBlock', () => {
    it('should keep the child slot and leaders in their kit types', async () => {
        getBlocks.mockResolvedValue([101n, 102n]);
        getSlotLeaders.mockResolvedValue(LEADERS);

        await fetchBlock(dispatch, MOCK_URL, Cluster.MainnetBeta, SLOT);

        expect(getRpc).toHaveBeenCalledWith(MOCK_URL);
        expect(getBlocks).toHaveBeenCalledWith(101n, 200n);
        // parentSlot..childSlot inclusive
        expect(getSlotLeaders).toHaveBeenCalledWith(99n, 3);

        const data = lastUpdate().data;
        expect(lastUpdate().status).toBe(FetchStatus.Fetched);
        expect(data?.childSlot).toBe(101n);
        expect(data?.parentLeader).toBe(LEADERS[0]);
        expect(data?.blockLeader).toBe(LEADERS[1]);
        expect(data?.childLeader).toBe(LEADERS[2]);
    });

    it('should leave the child slot and child leader undefined when no later block exists', async () => {
        getBlocks.mockResolvedValue([]);
        getSlotLeaders.mockResolvedValue(LEADERS);

        await fetchBlock(dispatch, MOCK_URL, Cluster.MainnetBeta, SLOT);

        expect(getSlotLeaders).toHaveBeenCalledWith(99n, 2);
        const data = lastUpdate().data;
        expect(data?.childSlot).toBeUndefined();
        expect(data?.childLeader).toBeUndefined();
        expect(data?.blockLeader).toBe(LEADERS[1]);
    });

    it('should still report the block when the leader lookup fails', async () => {
        getBlocks.mockResolvedValue([101n]);
        getSlotLeaders.mockRejectedValue(new Error('leader schedule unavailable'));

        await fetchBlock(dispatch, MOCK_URL, Cluster.MainnetBeta, SLOT);

        expect(lastUpdate().status).toBe(FetchStatus.Fetched);
        expect(lastUpdate().data?.blockLeader).toBeUndefined();
    });

    it('should report an empty block when the slot was skipped', async () => {
        fetchBlockBySlot.mockResolvedValue(null);

        await fetchBlock(dispatch, MOCK_URL, Cluster.MainnetBeta, SLOT);

        expect(getBlocks).not.toHaveBeenCalled();
        expect(lastUpdate()).toMatchObject({ data: {}, status: FetchStatus.Fetched });
    });

    it('should dispatch FetchFailed when the block fetch throws', async () => {
        fetchBlockBySlot.mockRejectedValue(new Error('rpc boom'));

        await fetchBlock(dispatch, MOCK_URL, Cluster.MainnetBeta, SLOT);

        expect(lastUpdate()).toMatchObject({ data: undefined, status: FetchStatus.FetchFailed });
    });
});
