import { withClusterAndAccounts } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import type { CompressedNft } from '@/app/providers/compressed-nft';

import { CompressedNFTHeader } from '../CompressedNftCard';

function buildCompressedNft(
    overrides: Partial<{
        name: string;
        symbol: string;
        mutable: boolean;
        compressed: boolean;
        assetInterface: string;
        collection: string | null;
    }> = {},
): CompressedNft {
    const {
        name = 'Compressed Ape #42',
        symbol = 'cAPE',
        mutable = true,
        compressed = true,
        assetInterface = 'V1_NFT',
        collection = null,
    } = overrides;
    return {
        authorities: [],
        burnt: false,
        compression: {
            asset_hash: '',
            compressed,
            creator_hash: '',
            data_hash: '',
            eligible: compressed,
            leaf_id: 0,
            seq: 0,
            tree: '',
        },
        content: {
            $schema: '',
            files: [],
            // Empty json_uri → useMetadataJsonLink short-circuits to null; ArtContent renders the placeholder.
            json_uri: '',
            links: { external_url: '', image: '' },
            metadata: { attributes: [], description: '', name, symbol, token_standard: '' },
        },
        creators: [],
        grouping: collection ? [{ group_key: 'collection', group_value: collection }] : [],
        id: 'CompressedNftaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        interface: assetInterface,
        mutable,
        ownership: { delegate: null, delegated: false, frozen: false, owner: '', ownership_model: 'single' },
        royalty: {
            basis_points: 0,
            locked: false,
            percent: 0,
            primary_sale_happened: false,
            royalty_model: '',
            target: null,
        },
        supply: { edition_nonce: null, print_current_supply: 0, print_max_supply: 0 },
    };
}

const meta: Meta<typeof CompressedNFTHeader> = {
    component: CompressedNFTHeader,
    decorators: [withClusterAndAccounts],
    tags: ['autodocs', 'test'],
    title: 'Components/Account/CompressedNFTHeader',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { compressedNft: buildCompressedNft() },
};

export const Immutable: Story = {
    args: { compressedNft: buildCompressedNft({ mutable: false }) },
};

export const NoName: Story = {
    args: { compressedNft: buildCompressedNft({ name: '' }) },
};

export const NoSymbol: Story = {
    args: { compressedNft: buildCompressedNft({ symbol: '' }) },
};

export const VerifiedCollection: Story = {
    args: { compressedNft: buildCompressedNft({ collection: 'CoLLeCtionaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }) },
};

export const UncompressedToken: Story = {
    args: {
        compressedNft: buildCompressedNft({
            assetInterface: 'FungibleToken',
            compressed: false,
            mutable: false,
            name: 'dogwifhat',
            symbol: '$WIF',
        }),
    },
};
