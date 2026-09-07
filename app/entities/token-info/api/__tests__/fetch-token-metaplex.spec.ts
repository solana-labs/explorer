import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { none, some } from '@metaplex-foundation/umi';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { gen } from '@/app/__fixtures__/gen';

const MINT_A = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MINT_B = 'So11111111111111111111111111111111111111112';
const RPC = 'https://rpc.example.com';
const NULL_CHAR = String.fromCharCode(0);
// A well-known valid CIDv0, as in app/features/metadata/__tests__/utils.spec.ts.
const VALID_CID = 'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u';

const mocks = vi.hoisted(() => ({
    fetchResource: vi.fn(),
    getMultipleAccounts: vi.fn(),
    getUmi: vi.fn(() => ({})),
    safeFetchAllMetadata: vi.fn(),
}));

vi.mock('@metaplex-foundation/mpl-token-metadata', async () => {
    const actual = await vi.importActual<typeof import('@metaplex-foundation/mpl-token-metadata')>(
        '@metaplex-foundation/mpl-token-metadata',
    );
    return {
        ...actual,
        // The PDA is derived by the real program elsewhere; here it only has to be a stable stand-in.
        findMetadataPda: vi.fn((_umi, { mint }: { mint: string }) => [`${mint}-pda`, 255]),
        safeFetchAllMetadata: mocks.safeFetchAllMetadata,
    };
});

vi.mock('@entities/cluster/@x/token-info', () => ({
    getRpc: vi.fn(() => ({
        getMultipleAccounts: (...args: unknown[]) => ({ send: () => mocks.getMultipleAccounts(...args) }),
    })),
}));

vi.mock('@/app/entities/nft/lib/umi', () => ({ getUmi: mocks.getUmi }));
// The off-chain JSON is read through the metadata proxy's hardened fetcher, in process.
vi.mock('@/app/api/metadata/proxy/feature', async () => {
    const actual = await vi.importActual<typeof import('@/app/api/metadata/proxy/feature')>(
        '@/app/api/metadata/proxy/feature',
    );
    return { ...actual, fetchResource: mocks.fetchResource };
});

type MetadataStub = { mint: string; name: string; symbol: string; tokenStandard: unknown; uri: string };

function metadata(mint: string, overrides: Partial<MetadataStub> = {}): MetadataStub {
    return {
        mint,
        name: 'USD Coin',
        symbol: 'USDC',
        tokenStandard: some(TokenStandard.Fungible),
        uri: 'https://example.com/metadata.json',
        ...overrides,
    };
}

function parsedMint(decimals: number) {
    return { data: { parsed: { info: { decimals } } } };
}

/** Shape `fetchResource` resolves to for a JSON body. */
function jsonResource(data: unknown) {
    return { data, headers: new Headers({ 'content-type': 'application/json' }) };
}

async function importSubject() {
    return await import('../fetch-token-metaplex');
}

describe('getTokenInfosFromMetaplex', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUmi.mockReturnValue({});
        mocks.safeFetchAllMetadata.mockResolvedValue([]);
        mocks.getMultipleAccounts.mockResolvedValue({ value: [] });
        mocks.fetchResource.mockResolvedValue(jsonResource({}));
    });

    it('should not touch the network without addresses', async () => {
        const { getTokenInfosFromMetaplex } = await importSubject();
        await expect(getTokenInfosFromMetaplex([], RPC)).resolves.toEqual([]);
        expect(mocks.safeFetchAllMetadata).not.toHaveBeenCalled();
    });

    it('should return nothing when no RPC endpoint is configured', async () => {
        const { getTokenInfosFromMetaplex } = await importSubject();
        await expect(getTokenInfosFromMetaplex([MINT_A], '')).resolves.toEqual([]);
        expect(mocks.safeFetchAllMetadata).not.toHaveBeenCalled();
    });

    it('should look up one metadata PDA per requested mint', async () => {
        const { getTokenInfosFromMetaplex } = await importSubject();
        await getTokenInfosFromMetaplex([MINT_A, MINT_B], RPC);

        expect(mocks.safeFetchAllMetadata).toHaveBeenCalledWith({}, [
            [`${MINT_A}-pda`, 255],
            [`${MINT_B}-pda`, 255],
        ]);
    });

    it('should batch the metadata lookup so it stays under the getMultipleAccounts key limit', async () => {
        // Umi sends every key in one request, and the RPC rejects more than 100 at a time.
        const addresses = Array.from({ length: 230 }, (_, i) => gen.address(i));

        const { getTokenInfosFromMetaplex } = await importSubject();
        await getTokenInfosFromMetaplex(addresses, RPC);

        expect(mocks.safeFetchAllMetadata).toHaveBeenCalledTimes(3);
        const batchSizes = mocks.safeFetchAllMetadata.mock.calls.map(([, pdas]) => pdas.length);
        expect(batchSizes).toEqual([100, 100, 30]);
    });

    it('should keep the mints a surviving batch resolved when another batch fails', async () => {
        const onError = vi.fn();
        const addresses = Array.from({ length: 150 }, (_, i) => gen.address(i));
        mocks.safeFetchAllMetadata
            .mockRejectedValueOnce(new Error('rpc exploded'))
            .mockResolvedValueOnce([metadata(MINT_B)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(9)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const result = await getTokenInfosFromMetaplex(addresses, RPC, { onError });

        expect(result.map(t => t.address)).toEqual([MINT_B]);
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should map on-chain metadata into unverified token info', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });
        mocks.fetchResource.mockResolvedValueOnce(jsonResource({ image: 'https://example.com/logo.png' }));

        const { getTokenInfosFromMetaplex } = await importSubject();

        await expect(getTokenInfosFromMetaplex([MINT_A], RPC)).resolves.toEqual([
            {
                address: MINT_A,
                decimals: 6,
                logoURI: 'https://example.com/logo.png',
                name: 'USD Coin',
                symbol: 'USDC',
                verified: false,
            },
        ]);
    });

    it('should keep only mints whose token standard is Fungible', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([
            metadata(MINT_A),
            metadata(MINT_B, { tokenStandard: some(TokenStandard.NonFungible) }),
        ]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const result = await getTokenInfosFromMetaplex([MINT_A, MINT_B], RPC);

        expect(result.map(t => t.address)).toEqual([MINT_A]);
    });

    it('should drop mints that declare no token standard', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A, { tokenStandard: none() })]);

        const { getTokenInfosFromMetaplex } = await importSubject();

        await expect(getTokenInfosFromMetaplex([MINT_A], RPC)).resolves.toEqual([]);
        // Nothing survived the filter, so the mint accounts are never read.
        expect(mocks.getMultipleAccounts).not.toHaveBeenCalled();
    });

    it('should strip the null padding the metadata program adds', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([
            metadata(MINT_A, { name: `USD Coin${NULL_CHAR.repeat(24)}`, symbol: `USDC${NULL_CHAR.repeat(6)}` }),
        ]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result.name).toBe('USD Coin');
        expect(result.symbol).toBe('USDC');
    });

    it('should read decimals from the mint account, including zero', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(0)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result.decimals).toBe(0);
    });

    it('should fall back to 6 decimals when the mint account is missing', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [null] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result.decimals).toBe(6);
    });

    it('should report a null logo when the off-chain JSON has no image', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });
        mocks.fetchResource.mockResolvedValueOnce(jsonResource({}));

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result.logoURI).toBeNull();
    });

    // Regression guard: this must never build a URL from the incoming request's host, and must
    // never fetch the mint's URI outside the proxy's hardened fetcher.
    it('should read the off-chain JSON through the proxy fetcher, bounded by the timeout', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });

        const { getTokenInfosFromMetaplex, METAPLEX_TIMEOUT_MS } = await importSubject();
        await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(mocks.fetchResource).toHaveBeenCalledWith(
            'https://example.com/metadata.json',
            expect.objectContaining({ timeout: METAPLEX_TIMEOUT_MS }),
        );
    });

    it('should keep the off-chain reads within the concurrency limit', async () => {
        const addresses = Array.from({ length: 20 }, (_, i) => gen.address(i));
        mocks.safeFetchAllMetadata.mockResolvedValueOnce(addresses.map(address => metadata(address)));
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: addresses.map(() => parsedMint(6)) });

        let inFlight = 0;
        let peak = 0;
        mocks.fetchResource.mockImplementation(async () => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise(resolve => setTimeout(resolve, 0));
            inFlight--;
            return jsonResource({});
        });

        const { getTokenInfosFromMetaplex, LOGO_CONCURRENCY } = await importSubject();
        await getTokenInfosFromMetaplex(addresses, RPC);

        expect(mocks.fetchResource).toHaveBeenCalledTimes(addresses.length);
        expect(peak).toBeGreaterThan(1);
        expect(peak).toBeLessThanOrEqual(LOGO_CONCURRENCY);
    });

    it('should keep every logo with its own mint when the reads settle out of order', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A), metadata(MINT_B)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6), parsedMint(6)] });
        mocks.fetchResource
            .mockImplementationOnce(
                () => new Promise(resolve => setTimeout(() => resolve(jsonResource({ image: 'logo-a' })), 10)),
            )
            .mockResolvedValueOnce(jsonResource({ image: 'logo-b' }));

        const { getTokenInfosFromMetaplex } = await importSubject();
        const result = await getTokenInfosFromMetaplex([MINT_A, MINT_B], RPC);

        expect(result.map(t => [t.address, t.logoURI])).toEqual([
            [MINT_A, 'logo-a'],
            [MINT_B, 'logo-b'],
        ]);
    });

    it('should give up the remaining logos once the batch spends its budget', async () => {
        vi.useFakeTimers();
        try {
            mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A), metadata(MINT_B)]);
            mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6), parsedMint(6)] });

            const { getTokenInfosFromMetaplex, LOGO_BUDGET_MS } = await importSubject();
            mocks.fetchResource.mockImplementationOnce(async () => {
                vi.advanceTimersByTime(LOGO_BUDGET_MS);
                return jsonResource({ image: 'logo-a' });
            });

            const result = await getTokenInfosFromMetaplex([MINT_A, MINT_B], RPC);

            // The batch still answers with both mints — only the second one's logo is dropped.
            expect(mocks.fetchResource).toHaveBeenCalledTimes(1);
            expect(result.map(t => [t.address, t.logoURI])).toEqual([
                [MINT_A, 'logo-a'],
                [MINT_B, null],
            ]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('should report a null logo when the proxy fetcher rejects the address', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });
        // What `fetchResource` does for a private host or a redirect loop.
        mocks.fetchResource.mockRejectedValueOnce(new Error('Hostname resolves to a private IP'));
        const onError = vi.fn();

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC, { onError });

        expect(result).toMatchObject({ address: MINT_A, logoURI: null });
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should ignore a non-JSON body rather than treat it as metadata', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });
        mocks.fetchResource.mockResolvedValueOnce({
            data: { image: 'https://example.com/logo.png' },
            headers: new Headers({ 'content-type': 'text/html' }),
        });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result.logoURI).toBeNull();
    });

    it('should skip the off-chain read for a mint with no uri', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A, { uri: '' })]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result.logoURI).toBeNull();
        expect(mocks.fetchResource).not.toHaveBeenCalled();
    });

    // `fetchResource` speaks only http(s), so an `ipfs://` uri handed to it straight would be
    // rejected as a blocked protocol and every IPFS-hosted mint would lose its logo. The browser
    // path already maps these through a gateway in `getProxiedUri`; this path must match it.
    it('should read an ipfs uri through the http gateway', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A, { uri: `ipfs://${VALID_CID}/meta.json` })]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });
        mocks.fetchResource.mockResolvedValueOnce(jsonResource({ image: 'https://example.com/logo.png' }));

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(mocks.fetchResource).toHaveBeenCalledWith(
            `https://ipfs.io/ipfs/${VALID_CID}/meta.json`,
            expect.anything(),
        );
        expect(result.logoURI).toBe('https://example.com/logo.png');
    });

    it('should skip the off-chain read for an ipfs uri with a malformed CID', async () => {
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A, { uri: 'ipfs://not-a-valid-cid' })]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC);

        expect(result).toMatchObject({ address: MINT_A, decimals: 6, logoURI: null, symbol: 'USDC' });
        expect(mocks.fetchResource).not.toHaveBeenCalled();
    });

    it('should skip the off-chain read for an unparseable uri', async () => {
        const onError = vi.fn();
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A, { uri: 'not-a-url' })]);
        mocks.getMultipleAccounts.mockResolvedValueOnce({ value: [parsedMint(6)] });

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC, { onError });

        expect(result.logoURI).toBeNull();
        expect(mocks.fetchResource).not.toHaveBeenCalled();
        // Junk on-chain data is not an app fault, and the NFT page maps `onError` to `Logger.error`.
        expect(onError).not.toHaveBeenCalled();
    });

    it('should report and return nothing when the metadata lookup throws', async () => {
        const onError = vi.fn();
        mocks.safeFetchAllMetadata.mockRejectedValueOnce(new Error('rpc exploded'));

        const { getTokenInfosFromMetaplex } = await importSubject();

        await expect(getTokenInfosFromMetaplex([MINT_A], RPC, { onError })).resolves.toEqual([]);
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should keep the token when reading its decimals fails', async () => {
        const onError = vi.fn();
        mocks.safeFetchAllMetadata.mockResolvedValueOnce([metadata(MINT_A)]);
        mocks.getMultipleAccounts.mockRejectedValueOnce(new Error('rpc exploded'));

        const { getTokenInfosFromMetaplex } = await importSubject();
        const [result] = await getTokenInfosFromMetaplex([MINT_A], RPC, { onError });

        expect(result).toMatchObject({ address: MINT_A, decimals: 6 });
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
});
