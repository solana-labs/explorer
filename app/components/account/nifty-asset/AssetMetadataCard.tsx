import { Asset, ExtensionType, getExtension } from '@nifty-oss/asset';
import React, { useState } from 'react';
import ReactJson from 'react-json-view';

export function NiftyAssetMetadataCard({ asset }: { asset: Asset }) {
    // check for metadata

    const [json, setJson] = useState(null);
    const metadata = getExtension(asset, ExtensionType.Metadata);

    async function fetchMetadataImage(uri: string) {
        try {
            const response = await fetch(uri);
            const metadata = await response.json();
            setJson(metadata);
        } catch (error) {
            // no metadata will be displayed if we cannot load it
        }
    }

    if (metadata?.uri) {
        React.useEffect(() => {
            fetchMetadataImage(metadata.uri);
        }, []); // eslint-disable-line react-hooks/exhaustive-deps
    }

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="card-header-title">Metadata</h3>
                        </div>
                    </div>
                </div>

                <div className="card metadata-json-viewer m-4">
                    {json && <ReactJson src={json} theme={'solarized'} style={{ padding: 25 }} />}
                </div>
            </div>
        </>
    );
}
