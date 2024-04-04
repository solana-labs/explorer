import { NFTData } from '@providers/accounts';
import ReactJson from 'react-json-view';

export function MetaplexMetadataCard({ nftData }: { nftData: NFTData }) {
    // Here we grossly stringify and parse the metadata to avoid the bigints which ReactJsonView does not support.
    const json = JSON.parse(JSON.stringify(nftData.metadata, (_, v) => typeof v === 'bigint' ? v.toString() : v));
    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="card-header-title">Metaplex Metadata</h3>
                        </div>
                    </div>
                </div>

                <div className="card metadata-json-viewer m-4">
                    <ReactJson src={json} theme={'solarized'} style={{ padding: 25 }} />
                </div>
            </div>
        </>
    );
}
