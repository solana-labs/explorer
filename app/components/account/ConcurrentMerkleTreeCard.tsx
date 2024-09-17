import { ConcurrentMerkleTreeAccount } from '@solana/spl-account-compression';
import { PublicKey } from '@solana/web3.js';

import { Address } from '../common/Address';
import { Slot } from '../common/Slot';
import { TableCardBody } from '../common/TableCardBody';

export function ConcurrentMerkleTreeCard({ data }: { data: Buffer }) {
    const cmt = ConcurrentMerkleTreeAccount.fromBuffer(Buffer.from(data));
    const authority = cmt.getAuthority();
    const root = cmt.getCurrentRoot();
    const seq = cmt.getCurrentSeq();
    const canopyDepth = cmt.getCanopyDepth();
    const maxBufferSize = cmt.getMaxBufferSize();
    const treeHeight = cmt.getMaxDepth();
    const creationSlot = cmt.getCreationSlot();
    const rightMostIndex = cmt.tree.rightMostPath.index;
    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="card-header-title">Concurrent Merkle Tree</h3>
                        </div>
                    </div>
                </div>

                <TableCardBody>
                    <tr>
                        <td>Authority</td>
                        <td className="text-lg-end">
                            <Address pubkey={authority} alignRight raw />
                        </td>
                    </tr>
                    <tr>
                        <td>Creation Slot</td>
                        <td className="text-lg-end">
                            <Slot slot={creationSlot.toNumber()} link />
                        </td>
                    </tr>
                    <tr>
                        <td>Max Depth</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{treeHeight}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>Max Buffer Size</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{maxBufferSize}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>Canopy Depth</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{canopyDepth}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>Current Sequence Number</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{seq.toString()}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>Current Root</td>
                        <td className="text-lg-end">
                            <Address pubkey={new PublicKey(root)} alignRight raw />
                        </td>
                    </tr>
                    <tr>
                        <td>Current Number of Leaves</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{rightMostIndex}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>Remaining Leaves</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{Math.pow(2, treeHeight) - rightMostIndex}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>Max Possible Leaves</td>
                        <td className="text-lg-end">
                            <span className="text-monospace">{Math.pow(2, treeHeight)}</span>
                        </td>
                    </tr>
                </TableCardBody>
            </div>
        </>
    );
}
