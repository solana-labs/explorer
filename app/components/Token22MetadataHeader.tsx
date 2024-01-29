import { ArtContent } from '@components/common/NFTArt';
import React, { useMemo } from 'react';
import useAsyncEffect from 'use-async-effect';

import { LoadingState as TokenMetadataLoadingState, useTokenMetadata } from './account/SplTokenMetadataInterfaceCard';

enum LoadingState {
    PreconditionFailed,
    Started,
    Succeeded,
    Failed,
}

function useTokenMetadataWithUri(mint: string) {
    const { loading, metadata } = useTokenMetadata(mint);

    const initialLoadingState =
        metadata && loading === TokenMetadataLoadingState.MetadataFound
            ? LoadingState.Started
            : LoadingState.PreconditionFailed;
    const [jsonLoading, setJsonLoading] = React.useState<LoadingState>(initialLoadingState);
    const [metadataJson, setMetadataJson] = React.useState<object | null>(null);

    useAsyncEffect(async () => {
        if (!metadata) {
            return;
        }
        try {
            const result = await fetch(metadata.uri);
            if (result.ok) {
                const json = await result.json();
                setMetadataJson(json);
                setJsonLoading(LoadingState.Succeeded);
            } else {
                setJsonLoading(LoadingState.Failed);
            }
        } catch (err) {
            setJsonLoading(LoadingState.Failed);
        }
    }, [loading, metadata]);

    return useMemo(() => ({ jsonLoading, jsonMetadata: metadataJson }), [jsonLoading, metadataJson]);
}

export function Token22NFTHeader({ mint }: { mint: string }) {
    const { metadata } = useTokenMetadata(mint);
    const { jsonLoading, jsonMetadata } = useTokenMetadataWithUri(mint);

    const ui = useMemo(() => {
        if (jsonLoading === LoadingState.PreconditionFailed || jsonLoading === LoadingState.Started) {
            return <div>Loading...</div>;
        }

        if (jsonLoading === LoadingState.Failed || !jsonMetadata || !metadata) {
            return <div>Failed</div>;
        }

        return (
            <div className="row">
                <div className="col-auto ms-2 d-flex align-items-center">
                    <ArtContent pubkey={mint} data={jsonMetadata as any} />
                </div>
                <div className="col mb-3 ms-0.5 mt-3">
                    {<h6 className="header-pretitle ms-1">Token Extension NFT</h6>}
                    <div className="d-flex align-items-center">
                        <h2 className="header-title ms-1 align-items-center no-overflow-with-ellipsis">
                            {metadata.name !== '' ? metadata.name : 'No NFT name was found'}
                        </h2>
                    </div>
                    <h4 className="header-pretitle ms-1 mt-1 no-overflow-with-ellipsis">
                        {metadata.symbol !== '' ? metadata.symbol : 'No Symbol was found'}
                    </h4>
                    <div className="ms-1">{new Map(metadata.additionalMetadata).get('Description')}</div>
                </div>
            </div>
        );
    }, [metadata, jsonLoading, jsonMetadata, mint]);

    return ui;
}

// function getIsMutablePill(isMutable: boolean) {
//     return <span className="badge badge-pill bg-dark">{`${isMutable ? 'Mutable' : 'Immutable'}`}</span>;
// }
