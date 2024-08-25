'use client';

import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { Asset, ExtensionType, getExtension, getInternalAssetAccountDataSerializer } from '@nifty-oss/asset';
import React from 'react';

import { NiftyAssetRuleSetCard } from '@/app/components/account/nifty-asset/AssetRuleSetCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function NiftyAssetRuleSetCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const data = account?.data.raw;
    const asset = data && (getInternalAssetAccountDataSerializer().deserialize(data)[0] as Asset);

    return asset && getExtension(asset, ExtensionType.Royalties) ? (
        <NiftyAssetRuleSetCard asset={asset} />
    ) : (
        onNotFound()
    );
}

export default function MetaplexNFTMetadataPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={NiftyAssetRuleSetCardRenderer} />;
}
