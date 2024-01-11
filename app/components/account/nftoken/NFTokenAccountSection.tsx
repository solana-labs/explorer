import { Address } from '@components/common/Address';
import { TableCardBody } from '@components/common/TableCardBody';
import { Account, useFetchAccountInfo } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import { Suspense, useState } from 'react';
import { RefreshCw } from 'react-feather';

import { UnknownAccountCard } from '../UnknownAccountCard';
import { parseNFTokenCollectionAccount, parseNFTokenNFTAccount } from './isNFTokenAccount';
import { useCollectionNfts } from './nftoken-hooks';
import { NftokenTypes } from './nftoken-types';

export function NFTokenAccountSection({ account }: { account: Account }) {
    const nft = parseNFTokenNFTAccount(account);
    if (nft) {
        return <NFTCard nft={nft} />;
    }

    const collection = parseNFTokenCollectionAccount(account);
    if (collection) {
        return <CollectionCard collection={collection} />;
    }

    return <UnknownAccountCard account={account} />;
}

const NFTCard = ({ nft }: { nft: NftokenTypes.NftAccount }) => {
    const fetchInfo = useFetchAccountInfo();
    const refresh = () => fetchInfo(new PublicKey(nft.address), 'parsed');

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Overview</h3>
                <button className="btn btn-white btn-sm" onClick={refresh}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(nft.address)} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Authority</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(nft.authority)} alignRight link />
                    </td>
                </tr>
                <tr>
                    <td>Holder</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(nft.holder)} alignRight link />
                    </td>
                </tr>
                <tr>
                    <td>Delegate</td>
                    <td className="text-lg-end">
                        {nft.delegate ? (
                            <Address pubkey={new PublicKey(nft.delegate)} alignRight link />
                        ) : (
                            'Not Delegated'
                        )}
                    </td>
                </tr>
                <tr>
                    <td>Collection</td>
                    <td className="text-lg-end">
                        {nft.collection ? (
                            <Address pubkey={new PublicKey(nft.collection)} alignRight link />
                        ) : (
                            'No Collection'
                        )}
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
};

export const NftokenImage = ({ url, size }: { url: string | undefined; size: number }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);

    return (
        <>
            {isLoading && (
                <div
                    style={{
                        backgroundColor: 'lightgrey',
                        height: size,
                        width: size,
                    }}
                />
            )}
            <div className={`rounded mx-auto ${isLoading ? 'd-none' : 'd-block'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    alt="nft"
                    height={size}
                    onLoad={() => {
                        setIsLoading(false);
                    }}
                    src={url}
                    width={size}
                />
            </div>
        </>
    )
};

const CollectionCard = ({ collection }: { collection: NftokenTypes.CollectionAccount }) => {
    const fetchInfo = useFetchAccountInfo();
    const refresh = () => fetchInfo(new PublicKey(collection.address), 'parsed');

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Overview</h3>
                <button className="btn btn-white btn-sm" onClick={refresh}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(collection.address)} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Authority</td>
                    <td className="text-lg-end">
                        <Address pubkey={new PublicKey(collection.authority)} alignRight link />
                    </td>
                </tr>
                <tr>
                    <td>Number of NFTs</td>
                    <td className="text-lg-end">
                        <Suspense fallback={<div>Loading...</div>}>
                            <NumNfts collection={collection.address} />
                        </Suspense>
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
};

const NumNfts = ({ collection }: { collection: string }) => {
    const { data: nfts } = useCollectionNfts({ collectionAddress: collection });
    return <div>{nfts.length}</div>;
};
