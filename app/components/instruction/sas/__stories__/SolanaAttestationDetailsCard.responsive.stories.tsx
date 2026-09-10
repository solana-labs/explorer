import { gen } from '@__fixtures__/gen';
import { PublicKey } from '@solana/web3.js';
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

import { SolanaAttestationDetailsCard } from '../SolanaAttestationDetailsCard';

// CreateCredential data layout: u8 discriminator + u32 name length + u32 signers length (9 bytes
// minimum for empty values). Requires 4 accounts (payer, credential, authority, systemProgram).
const sasIx = {
    data: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0]),
    keys: [
        { isSigner: true, isWritable: true, pubkey: gen.publicKey(1) },
        { isSigner: false, isWritable: true, pubkey: gen.publicKey(2) },
        { isSigner: true, isWritable: false, pubkey: gen.publicKey(3) },
        { isSigner: false, isWritable: false, pubkey: new PublicKey('11111111111111111111111111111111') },
    ],
    programId: new PublicKey('22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG'),
};

const meta: Meta<typeof SolanaAttestationDetailsCard> = {
    component: SolanaAttestationDetailsCard,
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
    title: 'Components/Instruction/SolanaAttestationDetailsCard@Media',
};

export default meta;
type Story = StoryObj<typeof meta>;

const args = { childIndex: undefined, index: 0, innerCards: undefined, ix: sasIx };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
