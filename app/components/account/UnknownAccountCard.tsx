import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { TableCardBody } from '@components/common/TableCardBody';
import { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { addressLabel } from '@utils/tx';
import React from 'react';

export function UnknownAccountCard({ account }: { account: Account }) {
    const { cluster } = useCluster();

    const label = addressLabel(account.pubkey.toBase58(), cluster);
    return (
        <div className="card">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Overview</h3>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                {label && (
                    <tr>
                        <td>Address Label</td>
                        <td className="text-lg-end">{label}</td>
                    </tr>
                )}
                <tr>
                    <td>Balance (SOL)</td>
                    <td className="text-lg-end">
                        {account.lamports === 0 ? 'Account does not exist' : <SolBalance lamports={account.lamports} />}
                    </td>
                </tr>

                {account.space !== undefined && (
                    <tr>
                        <td>Allocated Data Size</td>
                        <td className="text-lg-end">{account.space} byte(s)</td>
                    </tr>
                )}

                <tr>
                    <td>Assigned Program Id</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.owner} alignRight link />
                    </td>
                </tr>

                <tr>
                    <td>Executable</td>
                    <td className="text-lg-end">{account.executable ? 'Yes' : 'No'}</td>
                </tr>
            </TableCardBody>
        </div>
    );
}
