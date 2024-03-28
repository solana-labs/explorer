import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { TableCardBody } from '@components/common/TableCardBody';
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { Asset, Delegate, DelegateRole, State, getAssetAccountDataSerializer } from '@nifty-oss/asset';
import { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { addressLabel } from '@utils/tx';

export function NiftyAssetAccountCard({ account }: { account: Account }) {
    const { cluster } = useCluster();

    const label = addressLabel(account.pubkey.toBase58(), cluster);
    const data = account.data.raw;
    const asset = data && (getAssetAccountDataSerializer().deserialize(data)[0] as Asset);

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

                {asset && (
                    <tr>
                        <td>Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={toWeb3JsPublicKey(asset.authority)} alignRight link />
                        </td>
                    </tr>
                )}

                {asset && (
                    <tr>
                        <td>Owner</td>
                        <td className="text-lg-end">
                            <Address pubkey={toWeb3JsPublicKey(asset.owner)} alignRight link />
                        </td>
                    </tr>
                )}

                {asset && (
                    <tr>
                        <td>Group</td>
                        <td className="text-lg-end">
                            {asset.group ? (
                                <Address pubkey={toWeb3JsPublicKey(asset.group)} alignRight link />
                            ) : (
                                <div className="text-muted">None</div>
                            )}
                        </td>
                    </tr>
                )}

                {asset && (
                    <tr>
                        <td>Delegate {asset.delegate && getDelegateRolePills(asset.delegate)}</td>
                        <td className="text-lg-end">
                            {asset.delegate ? (
                                <Address pubkey={toWeb3JsPublicKey(asset.delegate.address!)} alignRight link />
                            ) : (
                                <div className="text-muted">None</div>
                            )}
                        </td>
                    </tr>
                )}

                {asset && (
                    <tr>
                        <td>State</td>
                        <td className="text-lg-end">
                            <h3 className="mb-0">
                                {asset.state === State.Unlocked ? (
                                    <span className="badge badge-pill bg-info-soft">Unlocked</span>
                                ) : (
                                    <span className="badge badge-pill bg-danger-soft">Locked</span>
                                )}
                            </h3>
                        </td>
                    </tr>
                )}
            </TableCardBody>
        </div>
    );
}

export function getDelegateRolePills(delegate: Delegate) {
    const roles: JSX.Element[] = [];

    delegate.roles.map(role => {
        roles.push(<span className="badge me-2 badge-pill bg-info-soft">{`${DelegateRole[role]}`}</span>);
    });

    return roles;
}
