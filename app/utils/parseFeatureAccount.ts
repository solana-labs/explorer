import { Account } from '@providers/accounts';
import * as BufferLayout from '@solana/buffer-layout';

export const FEATURE_PROGRAM_ID = 'Feature111111111111111111111111111111111111';

type FeatureAccount = {
    address: string;
    activatedAt: number | null;
};

function isFeatureAccount(account: Account): boolean {
    return account.owner.toBase58() === FEATURE_PROGRAM_ID && account.data.raw != null;
}

export const parseFeatureAccount = (account: Account): FeatureAccount => {
    if (!isFeatureAccount(account) || account.data.raw == null) {
        throw new Error(`Failed to parse ${account} as a feature account`);
    }
    const address = account.pubkey.toBase58();
    const parsed = BufferLayout.struct([
        ((): BufferLayout.Union => {
            const union = BufferLayout.union(BufferLayout.u8('isActivated'), null, 'activatedAt');
            union.addVariant(0, BufferLayout.constant(null), 'value');
            union.addVariant(1, BufferLayout.nu64(), 'value');
            return union;
        })(),
    ]).decode(account.data.raw);
    return {
        activatedAt: parsed.activatedAt.value,
        address,
    };
};
