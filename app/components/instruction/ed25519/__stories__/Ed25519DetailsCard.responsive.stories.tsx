import { getBase58Decoder } from '@solana/kit';
import { ParsedTransaction, PublicKey } from '@solana/web3.js';
import {
    nextjsParameters,
    withCluster,
    withMockTransactions,
    withScrollAnchor,
    withTokenInfoBatch,
    withTxInstructionSurface,
} from '@storybook-config/decorators';
import { INITIAL_VIEWPORTS, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { Ed25519DetailsCard } from '../Ed25519DetailsCard';

const BASE58_DECODER = getBase58Decoder();

const ix = {
    data: Buffer.from('01000c0001004c0001006e008a000100', 'hex'),
    keys: [],
    programId: new PublicKey('Ed25519SigVerify111111111111111111111111111'),
};

const surroundingIx = {
    accounts: [],
    data: BASE58_DECODER.decode(Buffer.alloc(256)),
    programId: new PublicKey('11111111111111111111111111111111'),
} as any;

const tx = {
    message: {
        accountKeys: [],
        instructions: [ix as any, surroundingIx],
        recentBlockhash: '',
    },
    signatures: [],
} as unknown as ParsedTransaction;

const meta: Meta<typeof Ed25519DetailsCard> = {
    component: Ed25519DetailsCard,
    decorators: [
        withCluster,
        withScrollAnchor,
        withTokenInfoBatch,
        withMockTransactions,
        withTxInstructionSurface,
        withViewportFromGlobal,
    ],
    parameters: {
        ...nextjsParameters,
        viewport: { options: INITIAL_VIEWPORTS },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Instruction/Ed25519DetailsCard@Media',
};

export default meta;
type Story = StoryObj<typeof meta>;

const args = { childIndex: undefined, index: 0, innerCards: undefined, ix, tx };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
