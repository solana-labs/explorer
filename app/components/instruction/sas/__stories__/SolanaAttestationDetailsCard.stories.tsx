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
import type { Meta, StoryObj } from '@storybook-config/types';

import { SolanaAttestationDetailsCard } from '../SolanaAttestationDetailsCard';

// CreateCredential layout: u8 discriminator (0) + u32 name length (0) + u32 signers length (0).
// Minimum 9 bytes for empty name and empty signers list. Requires 4 accounts (payer, credential,
// authority, systemProgram).
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
    decorators: [withCluster, withScrollAnchor, withTokenInfoBatch, withMockTransactions, withTxInstructionSurface],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Instruction/SolanaAttestationDetailsCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { childIndex: undefined, index: 0, innerCards: undefined, ix: sasIx },
};
