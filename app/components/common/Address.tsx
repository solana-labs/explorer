'use client';

import { Connection, programs } from '@metaplex/js';
import { useCluster } from '@providers/cluster';
import { useTokenRegistry } from '@providers/token-registry';
import { PublicKey } from '@solana/web3.js';
import { displayAddress } from '@utils/tx';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';
import { useEffect, useState } from 'react';

import { Copyable } from './Copyable';

type Props = {
    pubkey: PublicKey;
    alignRight?: boolean;
    link?: boolean;
    raw?: boolean;
    truncate?: boolean;
    truncateUnknown?: boolean;
    truncateChars?: number;
    useMetadata?: boolean;
    overrideText?: string;
};

export function Address({
    pubkey,
    alignRight,
    link,
    raw,
    truncate,
    truncateUnknown,
    truncateChars,
    useMetadata,
    overrideText,
}: Props) {
    const address = pubkey.toBase58();
    const { tokenRegistry } = useTokenRegistry();
    const { cluster } = useCluster();
    const addressPath = useClusterPath({ pathname: `/address/${address}` });
    if (truncateUnknown && address === displayAddress(address, cluster, tokenRegistry)) {
        truncate = true;
    }

    let addressLabel = raw ? address : displayAddress(address, cluster, tokenRegistry);

    const metaplexData = useTokenMetadata(useMetadata, address);
    if (metaplexData && metaplexData.data) addressLabel = metaplexData.data.data.name;
    if (truncateChars && addressLabel === address) {
        addressLabel = addressLabel.slice(0, truncateChars) + '…';
    }

    if (overrideText) {
        addressLabel = overrideText;
    }

    const content = (
        <Copyable text={address} replaceText={!alignRight}>
            <span className="font-monospace">
                {link ? (
                    <Link className={truncate ? 'text-truncate address-truncate' : ''} href={addressPath}>
                        {addressLabel}
                    </Link>
                ) : (
                    <span className={truncate ? 'text-truncate address-truncate' : ''}>{addressLabel}</span>
                )}
            </span>
        </Copyable>
    );

    return (
        <>
            <div className={`d-none d-lg-flex align-items-center ${alignRight ? 'justify-content-end' : ''}`}>
                {content}
            </div>
            <div className="d-flex d-lg-none align-items-center">{content}</div>
        </>
    );
}
export const useTokenMetadata = (useMetadata: boolean | undefined, pubkey: string) => {
    const [data, setData] = useState<programs.metadata.MetadataData>();
    const { url } = useCluster();

    useEffect(() => {
        if (!useMetadata) return;
        if (pubkey && !data) {
            programs.metadata.Metadata.getPDA(pubkey)
                .then(pda => {
                    const connection = new Connection(url);
                    programs.metadata.Metadata.load(connection, pda)
                        .then(metadata => {
                            setData(metadata.data);
                        })
                        .catch(() => {
                            setData(undefined);
                        });
                })
                .catch(() => {
                    setData(undefined);
                });
        }
    }, [useMetadata, pubkey, url, data, setData]);
    return { data };
};
