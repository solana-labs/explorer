'use client';

import { NiftyAssetExtensionsCard } from '@/app/components/account/nifty-asset/AssetExtensionsCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { Asset, getAssetAccountDataSerializer } from '@nifty-oss/asset';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function NiftyAssetExtensionsCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const data = account?.data.raw;
    const asset = data && (getAssetAccountDataSerializer().deserialize(data)[0] as Asset);

    return asset && asset.extensions.length > 0 ? <NiftyAssetExtensionsCard asset={asset} /> : onNotFound();
}

export default function MetaplexNFTMetadataPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={NiftyAssetExtensionsCardRenderer} />;
}
