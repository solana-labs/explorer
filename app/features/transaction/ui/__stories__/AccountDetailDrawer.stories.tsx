import { gen } from '@__fixtures__/gen';
import { ParsedMessage, ParsedMessageAccount, PublicKey, SystemProgram } from '@solana/web3.js';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { nextjsParameters, withClusterAccountsAndTokenInfo } from '@storybook-config/decorators';
import { expect, fn, within } from 'storybook/test';

import { AccountDetailDrawer } from '../AccountDetailDrawer';

const FEE_PAYER = new PublicKey(gen.blockhash(2));

const mockAccount: ParsedMessageAccount = {
    pubkey: FEE_PAYER,
    signer: true,
    source: 'transaction',
    writable: true,
};

const mockMessage = {
    accountKeys: [mockAccount],
    addressTableLookups: [],
    instructions: [],
    recentBlockhash: gen.blockhash(0),
} as unknown as ParsedMessage;

const meta: Meta<typeof AccountDetailDrawer> = {
    args: {
        account: mockAccount,
        accountInfoLoading: false,
        index: 0,
        message: mockMessage,
        onOpenChange: fn(),
        open: true,
    },
    component: AccountDetailDrawer,
    decorators: [withClusterAccountsAndTokenInfo],
    parameters: {
        ...nextjsParameters,
        // Render at mobile viewport to match intended use case
        viewport: { defaultViewport: 'mobile1' },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/Transaction/AccountDetailDrawer@Media',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        account: {
            pubkey: new PublicKey(SystemProgram.programId),
            signer: false,
            source: 'transaction',
            writable: false,
        },
        index: 3,
        message: {
            ...mockMessage,
            instructions: [
                { programId: new PublicKey(SystemProgram.programId) } as unknown as ParsedMessage['instructions'][0],
            ],
        },
    },
    play: async () => {
        const body = within(document.body);
        await body.findByRole('dialog');
        expect(body.getByText('Account 4')).toBeInTheDocument();
    },
};
