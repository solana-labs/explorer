import { TxInstructionSurface } from '@entities/instruction-card';
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
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';

import { Ed25519DetailsCard } from '../Ed25519DetailsCard';

const BASE58_DECODER = getBase58Decoder();

// Hex bytes encode a valid single-signature Ed25519 instruction layout.
// Source: existing __tests__/Ed25519DetailsCard.test.tsx fixture.
const ix = {
    data: Buffer.from('01000c0001004c0001006e008a000100', 'hex'),
    keys: [],
    programId: new PublicKey('Ed25519SigVerify111111111111111111111111111'),
};

// Surrounding instruction at index 1 — the offsets in `ix.data` point into this instruction's
// base58-encoded data for signature/pubkey/message bytes. 256 zeros render empty fields without
// requiring a real signed payload.
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

/** The transaction's result reaches the card through the surface, so a failed one needs its own. */
const withFailedInstructionSurface: Decorator = Story => (
    <TxInstructionSurface result={{ err: { InstructionError: [0, 'Custom'] } }}>
        <Story />
    </TxInstructionSurface>
);

const meta: Meta<typeof Ed25519DetailsCard> = {
    component: Ed25519DetailsCard,
    decorators: [withCluster, withScrollAnchor, withTokenInfoBatch, withMockTransactions, withTxInstructionSurface],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Instruction/Ed25519DetailsCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

const args = { childIndex: undefined, index: 0, innerCards: undefined, ix, tx };

export const SingleSignature: Story = { args };

export const Failed: Story = { args, decorators: [withFailedInstructionSurface] };
