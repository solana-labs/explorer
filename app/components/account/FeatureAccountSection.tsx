import { Address } from '@components/common/Address';
import { TableCardBody } from '@components/common/TableCardBody';
import { Account } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import { parseFeatureAccount } from '@utils/parseFeatureAccount';
import { ErrorBoundary } from 'react-error-boundary';

import { UnknownAccountCard } from './UnknownAccountCard';

export function FeatureAccountSection({ account }: { account: Account }) {
    return (
        <ErrorBoundary fallback={<UnknownAccountCard account={account} />}>
            <FeatureCard account={account} />
        </ErrorBoundary>
    );
}

type Props = Readonly<{
    account: Account;
}>;

const FeatureCard = ({ account }: Props) => {
    const feature = parseFeatureAccount(account);
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
                        <code>{feature.activatedAt === null ? 'No' : 'Yes'}</code>
                    </td>
                </tr>

                {activatedAt}
            </TableCardBody>
        </div>
    );
};
