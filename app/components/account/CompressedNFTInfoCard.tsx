import { Account, useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { ConcurrentMerkleTreeAccount, MerkleTree } from '@solana/spl-account-compression';
import { PublicKey } from '@solana/web3.js';
import React from 'react';

import { useCluster } from '@/app/providers/cluster';
import {
    CompressedNft,
    CompressedNftProof,
    useCompressedNft,
    useCompressedNftProof,
} from '@/app/providers/compressed-nft';

import { Address } from '../common/Address';
import { TableCardBody } from '../common/TableCardBody';

export function CompressedNFTInfoCard({ account, onNotFound }: { account?: Account; onNotFound: () => never }) {
    const { url } = useCluster();
    const compressedNft = useCompressedNft({ address: account?.pubkey.toString() ?? '', url });
    const proof = useCompressedNftProof({ address: account?.pubkey.toString() ?? '', url });

    if (compressedNft && compressedNft.compression.compressed && proof) {
        return <DasCompressionInfoCard proof={proof} compressedNft={compressedNft} />;
    }
    return onNotFound();
}

function DasCompressionInfoCard({ proof, compressedNft }: { proof: CompressedNftProof; compressedNft: CompressedNft }) {
    const compressedInfo = compressedNft.compression;
    const fetchAccountInfo = useFetchAccountInfo();
    const treeAccountInfo = useAccountInfo(compressedInfo.tree);
    const treeAddress = new PublicKey(compressedInfo.tree);

    React.useEffect(() => {
        fetchAccountInfo(treeAddress, 'raw');
    }, [compressedInfo.tree]); // eslint-disable-line react-hooks/exhaustive-deps

    const root = new PublicKey(proof.root);
    const proofVerified = MerkleTree.verify(root.toBuffer(), {
        leaf: new PublicKey(compressedNft.compression.asset_hash).toBuffer(),
        leafIndex: compressedNft.compression.leaf_id,
        proof: proof.proof.map(proofData => new PublicKey(proofData).toBuffer()),
        root: root.toBuffer(),
    });
    const canopyDepth =
        treeAccountInfo && treeAccountInfo.data && treeAccountInfo.data.data.raw
            ? ConcurrentMerkleTreeAccount.fromBuffer(treeAccountInfo.data.data.raw).getCanopyDepth()
            : 0;
    const proofSize = proof.proof.length - canopyDepth;
    return (
        <div className="card">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Compression Info</h3>
            </div>

            <TableCardBody>
                <tr>
                    <td>Concurrent Merkle Tree</td>
                    <td>
                        <Address pubkey={treeAddress} alignRight link raw />
                    </td>
                </tr>
                <tr>
                    <td>Current Tree Root {getVerifiedProofPill(proofVerified)}</td>
                    <td>
                        <Address pubkey={root} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Proof Size {getProofSizePill(proofSize)}</td>
                    <td className="text-lg-end">{proofSize}</td>
                </tr>
                <tr>
                    <td>Leaf Number</td>
                    <td className="text-lg-end">{compressedInfo.leaf_id}</td>
                </tr>
                <tr>
                    <td>Sequence Number of Last Update</td>
                    <td className="text-lg-end">{compressedInfo.seq}</td>
                </tr>
                <tr>
                    <td>Compressed Nft Hash</td>
                    <td>
                        <Address pubkey={new PublicKey(compressedInfo.asset_hash)} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Creators Hash</td>
                    <td>
                        <Address pubkey={new PublicKey(compressedInfo.creator_hash)} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Metadata Hash</td>
                    <td>
                        <Address pubkey={new PublicKey(compressedInfo.data_hash)} alignRight raw />
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
}

function getVerifiedProofPill(verified: boolean) {
    return (
        <div className={'d-inline-flex align-items-center ms-2'}>
            <span className={`badge badge-pill bg-dark ${verified ? '' : 'bg-danger-soft'}`}>{`Proof ${
                verified ? '' : 'Not'
            } Verified`}</span>
        </div>
    );
}

function getProofSizePill(proofSize: number) {
    let text: string;
    let color = 'bg-dark';
    if (proofSize == 0) {
        text = 'No Proof Required';
    } else if (proofSize > 8) {
        text = `Composability Hazard`;
        color = 'bg-danger-soft';
    } else {
        return <div />;
    }

    return (
        <div className={'d-inline-flex align-items-center ms-2'}>
            <span className={`badge badge-pill ${color}`}>{text}</span>
        </div>
    );
}
