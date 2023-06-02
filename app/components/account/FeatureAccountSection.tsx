import { Address } from '@components/common/Address';
import { TableCardBody } from '@components/common/TableCardBody';
import { Account } from '@providers/accounts';
import * as BufferLayout from '@solana/buffer-layout';
import { PublicKey } from "@solana/web3.js";

import { UnknownAccountCard } from './UnknownAccountCard';

export const FEATURE_PROGRAM_ID = new PublicKey('Feature111111111111111111111111111111111111');

export type FeatureAccount = {
    address: string;
    activatedAt: number | null;
};

export const featureAccountLayout = BufferLayout.struct([
    ((): BufferLayout.Union => {
        const union = BufferLayout.union(BufferLayout.u8('isActivated'), null, "activatedAt");
        union.addVariant(0, BufferLayout.struct([]), "none");
        union.addVariant(1, BufferLayout.nu64(), 'some');
        return union;
    })()
]);

export function isFeatureAccount(account: Account): boolean {
    return Boolean(account.owner.equals(FEATURE_PROGRAM_ID) && account.data.raw);
}

export const parseFeatureAccount = (account: Account): FeatureAccount | null => {
    if (!isFeatureAccount(account)) {
        return null;
    }

    try {
        const parsed = featureAccountLayout.decode(account.data.raw!);

        if (!parsed) {
            return null;
        }

        let activatedAt: number | null = null;
        if (parsed.activatedAt.some) {
            activatedAt = parsed.activatedAt.some;
        }

        return {
            activatedAt: activatedAt,
            address: account.pubkey.toBase58(),
        }
    } catch (e) {
        console.error('Problem parsing Feature Account...', e);
        return null;
    }
}

export function FeatureAccountSection({ account }: { account: Account }) {
    const feature = parseFeatureAccount(account);
    if (feature) {
        return <FeatureCard feature={feature} />;
    }

    return <UnknownAccountCard account={account} />;
}

const FeatureCard = ({ feature }: { feature: FeatureAccount }) => {
    let activatedAt;
    if (feature.activatedAt) {
        activatedAt = (
            <tr>
                <td>Activated At Slot</td>
                <td className="text-lg-end">
                    <code>{feature.activatedAt}</code>
                </td>
            </tr>
        );
    }
    console.log(feature);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Feature Activation</h3>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(feature.address)} alignRight raw />
                    </td>
                </tr>

                <tr>
                    <td>Activated?</td>
                    <td className="text-lg-end">
                        <code>{feature.activatedAt === null ? "No" : "Yes"}</code>
                    </td>
                </tr>

                {activatedAt}
            </TableCardBody>
        </div>
    )
};
