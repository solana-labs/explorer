import { Asset, ExtensionType, getExtension } from '@nifty-oss/asset';
import ReactJson from 'react-json-view';

export function NiftyAssetRuleSetCard({ asset }: { asset: Asset }) {
    const royalties = getExtension(asset, ExtensionType.Royalties);

    if (!royalties) {
        return null;
    }

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="card-header-title">Royalties Rule Set</h3>
                        </div>
                    </div>
                </div>

                <div className="card metadata-json-viewer m-4">
                    {royalties && <ReactJson src={royalties.constraint} theme={'solarized'} style={{ padding: 25 }} />}
                </div>
            </div>
        </>
    );
}
