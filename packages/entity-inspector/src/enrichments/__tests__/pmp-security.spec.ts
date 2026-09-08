import { fetchMaybeMetadataFromSeeds, unpackAndFetchData } from '@solana-program/program-metadata';
import { createSolanaRpc } from '@solana/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import { fetchPmpSecurityMetadata } from '../pmp-security.js';

vi.mock('@solana/kit', () => ({
    address: vi.fn((value: string) => value),
    createSolanaRpc: vi.fn(() => ({})),
}));

vi.mock('@solana-program/program-metadata', () => ({
    fetchMaybeMetadataFromSeeds: vi.fn(),
    unpackAndFetchData: vi.fn(),
}));

// Shrinks the RPC timeout so the unpack-timeout case does not wait 5s.
vi.mock('../../shared/constants.js', async importOriginal => ({
    ...(await importOriginal<Record<string, unknown>>()),
    RPC_REQUEST_TIMEOUT_MS: 10,
}));

const PROGRAM_ADDRESS = gen.tokenProgram;

const RPC_ENDPOINTS = {
    devnet: 'https://devnet.rpc.address',
    'mainnet-beta': 'https://mainnet-beta.rpc.address',
    testnet: 'https://testnet.rpc.address',
};

const EXISTING_METADATA = {
    data: { compression: 0, data: new Uint8Array(), dataSource: 0, encoding: 0 },
    exists: true,
} as never;

describe('fetchPmpSecurityMetadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null when the metadata account does not exist', async () => {
        vi.mocked(fetchMaybeMetadataFromSeeds).mockResolvedValue({ exists: false } as never);

        const result = await fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'mainnet-beta', RPC_ENDPOINTS);

        expect(result).toBeNull();
        expect(fetchMaybeMetadataFromSeeds).toHaveBeenCalledOnce();
        expect(createSolanaRpc).toHaveBeenCalledWith('https://mainnet-beta.rpc.address');
    });

    it('should fetch the security seed for the program address', async () => {
        vi.mocked(fetchMaybeMetadataFromSeeds).mockResolvedValue({ exists: false } as never);

        await fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'devnet', RPC_ENDPOINTS);

        expect(createSolanaRpc).toHaveBeenCalledWith('https://devnet.rpc.address');
        expect(fetchMaybeMetadataFromSeeds).toHaveBeenCalledWith(
            expect.anything(),
            { authority: null, program: PROGRAM_ADDRESS, seed: 'security' },
            expect.anything(),
        );
    });

    it('should return unpacked content when the metadata account exists', async () => {
        const jsonContent = '{"name":"Test"}';
        vi.mocked(fetchMaybeMetadataFromSeeds).mockResolvedValue(EXISTING_METADATA);
        vi.mocked(unpackAndFetchData).mockResolvedValue(jsonContent);

        const result = await fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'mainnet-beta', RPC_ENDPOINTS);

        expect(result).toBe(jsonContent);
        expect(unpackAndFetchData).toHaveBeenCalledOnce();
    });

    it('should throw when fetchMaybeMetadataFromSeeds fails', async () => {
        vi.mocked(fetchMaybeMetadataFromSeeds).mockRejectedValue(new Error('RPC timeout'));

        await expect(fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'mainnet-beta', RPC_ENDPOINTS)).rejects.toThrow(
            'RPC timeout',
        );
    });

    it('should throw when unpackAndFetchData fails', async () => {
        vi.mocked(fetchMaybeMetadataFromSeeds).mockResolvedValue(EXISTING_METADATA);
        vi.mocked(unpackAndFetchData).mockRejectedValue(new Error('decompression failed'));

        await expect(fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'mainnet-beta', RPC_ENDPOINTS)).rejects.toThrow(
            'decompression failed',
        );
    });

    describe('timeout behavior', () => {
        it('should pass an AbortSignal to fetchMaybeMetadataFromSeeds', async () => {
            vi.mocked(fetchMaybeMetadataFromSeeds).mockResolvedValue({ exists: false } as never);

            await fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'mainnet-beta', RPC_ENDPOINTS);

            expect(fetchMaybeMetadataFromSeeds).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
            );
        });

        it('should reject when the data unpack exceeds the timeout', async () => {
            vi.mocked(fetchMaybeMetadataFromSeeds).mockResolvedValue(EXISTING_METADATA);
            vi.mocked(unpackAndFetchData).mockReturnValue(new Promise(() => {}) as never);

            await expect(fetchPmpSecurityMetadata(PROGRAM_ADDRESS, 'mainnet-beta', RPC_ENDPOINTS)).rejects.toThrow(
                'PMP unpack timed out',
            );
        });
    });
});
