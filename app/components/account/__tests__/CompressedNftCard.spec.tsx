import { TOKEN_PROGRAM_ID } from '@providers/accounts/tokens';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompressedNftCard, CompressedNFTHeader, getAssetTypeLabel } from '@/app/components/account/CompressedNftCard';
import type { Account } from '@/app/providers/accounts';
import type { CompressedNft } from '@/app/providers/compressed-nft';

const useCompressedNft = vi.hoisted(() => vi.fn<() => CompressedNft | null>(() => null));

vi.mock('@/app/providers/cluster', () => ({
    useCluster: vi.fn(() => ({ cluster: 'devnet', url: 'https://api.devnet.solana.com' })),
}));

vi.mock('@/app/providers/compressed-nft', () => ({
    useCompressedNft,
    useMetadataJsonLink: vi.fn(() => null),
}));

vi.mock('../UnknownAccountCard', () => ({
    UnknownAccountCard: () => <div data-testid="unknown-account-card" />,
}));

function makeAccount(): Account {
    return {
        data: { raw: Buffer.alloc(82) },
        executable: false,
        lamports: 1_000_000,
        owner: TOKEN_PROGRAM_ID,
        pubkey: PublicKey.default,
        space: 82,
    };
}

// getAsset resolves fungible mints too, and returns an empty owner for them.
function makeFungibleAsset(overrides: Partial<CompressedNft> = {}): CompressedNft {
    return {
        authorities: [{ address: PublicKey.default.toBase58(), scopes: ['full'] }],
        burnt: false,
        compression: {
            asset_hash: '',
            compressed: false,
            creator_hash: '',
            data_hash: '',
            eligible: false,
            leaf_id: 0,
            seq: 0,
            tree: '',
        },
        content: {
            $schema: '',
            files: [],
            json_uri: '',
            links: { external_url: '', image: '' },
            metadata: {
                attributes: [],
                description: '',
                name: 'dogwifhat',
                symbol: '$WIF',
                token_standard: 'Fungible',
            },
        },
        creators: [],
        grouping: [],
        id: PublicKey.default.toBase58(),
        interface: 'FungibleToken',
        mutable: false,
        ownership: { delegate: null, delegated: false, frozen: false, owner: '', ownership_model: 'token' },
        royalty: {
            basis_points: 0,
            locked: false,
            percent: 0,
            primary_sale_happened: false,
            royalty_model: 'creators',
            target: null,
        },
        supply: { edition_nonce: null, print_current_supply: 0, print_max_supply: 0 },
        ...overrides,
    };
}

// A non-compressed asset that does have an owner, so the card can still describe it.
function makeCoreAsset(overrides: Partial<CompressedNft> = {}): CompressedNft {
    const base = makeFungibleAsset();
    return {
        ...base,
        grouping: [{ group_key: 'collection', group_value: PublicKey.default.toBase58() }],
        interface: 'MplCoreAsset',
        ownership: { ...base.ownership, owner: PublicKey.default.toBase58(), ownership_model: 'single' },
        ...overrides,
    };
}

function makeCompressedNft(overrides: Partial<CompressedNft> = {}): CompressedNft {
    const base = makeFungibleAsset();
    return {
        ...base,
        compression: { ...base.compression, compressed: true, eligible: true },
        grouping: [{ group_key: 'collection', group_value: PublicKey.default.toBase58() }],
        interface: 'V1_NFT',
        ownership: { ...base.ownership, owner: PublicKey.default.toBase58(), ownership_model: 'single' },
        ...overrides,
    };
}

describe('CompressedNftCard', () => {
    it('should fall back to the unknown-account card for an asset with no owner', () => {
        useCompressedNft.mockReturnValue(makeFungibleAsset());

        render(<CompressedNftCard account={makeAccount()} />);

        expect(screen.getByTestId('unknown-account-card')).toBeDefined();
    });

    it('should still describe a non-compressed asset that has an owner', () => {
        useCompressedNft.mockReturnValue(makeCoreAsset());

        render(<CompressedNftCard account={makeAccount()} />);

        expect(screen.queryByTestId('unknown-account-card')).toBeNull();
        expect(screen.getByText('Owner')).toBeDefined();
        expect(screen.getByText('Update Authority')).toBeDefined();
    });
});

describe('getAssetTypeLabel', () => {
    it('should label a compressed asset as a compressed NFT', () => {
        expect(getAssetTypeLabel(makeCompressedNft())).toBe('Metaplex Compressed NFT');
    });

    it('should label an uncompressed asset from its interface', () => {
        expect(getAssetTypeLabel(makeFungibleAsset())).toBe('Token');
        expect(getAssetTypeLabel(makeFungibleAsset({ interface: 'V1_NFT' }))).toBe('Metaplex NFT');
        expect(getAssetTypeLabel(makeFungibleAsset({ interface: 'MplCoreAsset' }))).toBe('Metaplex Core Asset');
    });

    it('should fall back to a generic label for an unknown interface', () => {
        expect(getAssetTypeLabel(makeFungibleAsset({ interface: 'SomethingNew' }))).toBe('Asset');
    });
});

describe('CompressedNFTHeader', () => {
    it('should keep the art but drop compressed-only labels for an uncompressed asset', () => {
        render(<CompressedNFTHeader compressedNft={makeFungibleAsset()} />);

        expect(screen.getByText('Token')).toBeDefined();
        expect(screen.getByText('dogwifhat')).toBeDefined();
        expect(screen.queryByText('Metaplex Compressed NFT')).toBeNull();
        expect(screen.queryByText('Compressed')).toBeNull();
        expect(screen.queryByText('Verified Collection')).toBeNull();
    });

    it('should keep compressed labels for a real compressed NFT', () => {
        render(<CompressedNFTHeader compressedNft={makeCompressedNft()} />);

        expect(screen.getByText('Metaplex Compressed NFT')).toBeDefined();
        expect(screen.getByText('Compressed')).toBeDefined();
        expect(screen.getByText('Verified Collection')).toBeDefined();
    });
});
