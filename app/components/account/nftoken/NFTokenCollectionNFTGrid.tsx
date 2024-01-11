'use client';

import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';
import { RefreshCw } from 'react-feather';

import { useCollectionNfts } from './nftoken-hooks';
import { NftokenTypes } from './nftoken-types';
import { NftokenImage } from './NFTokenAccountSection';

export function NFTokenCollectionNFTGrid({ collection }: { collection: string }) {
    const { data: nfts, mutate } = useCollectionNfts({
        collectionAddress: collection,
    });
    return (
        <div className="card">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">NFTs</h3>

                <button className="btn btn-white btn-sm" onClick={() => mutate()}>
                    <RefreshCw className="align-text-top me-2" size={13} />
                    Refresh
                </button>
            </div>

            <div className="py-4">
                {nfts.length === 0 && <div className={'px-4'}>No NFTs Found</div>}

                {nfts.length > 0 && (
                    <div
                        style={{
                            display: 'grid',

                            gridGap: '1.5rem',
                            /* Creates as many columns as possible that are at least 10rem wide. */
                            gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
                        }}
                    >
                        {nfts.map(nft => (
                            <Nft nft={nft} key={nft.address} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Nft({ nft }: { nft: NftokenTypes.NftInfo }) {
    const nftPath = useClusterPath({ pathname: `/address/${nft.address}` });
    return (
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                justifyContent: 'center',
            }}
        >
            <NftokenImage url={nft.image} size={80} />
            <div>
                <Link href={nftPath}>
                    <div>{nft.name ?? 'No Name'}</div>
                </Link>
            </div>
        </div>
    );
}
