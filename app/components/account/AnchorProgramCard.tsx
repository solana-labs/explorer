'use client';

import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import { useState } from 'react';
import ReactJson from 'react-json-view';

import { getIdlSpecType } from '@/app/utils/convertLegacyIdl';

import { DownloadableButton } from '../common/Downloadable';
import { IDLBadge } from '../common/IDLBadge';

export function AnchorProgramCard({ programId }: { programId: string }) {
    const { url } = useCluster();
    const { idl } = useAnchorProgram(programId, url);
    const [collapsedValue, setCollapsedValue] = useState<boolean | number>(1);

    if (!idl) {
        return null;
    }
    const spec = getIdlSpecType(idl);

    return (
        <div className="card">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col">
                        <h3 className="card-header-title">Anchor IDL</h3>
                    </div>
                    <div className="col-auto btn btn-sm btn-primary d-flex align-items-center">
                        <DownloadableButton
                            data={Buffer.from(JSON.stringify(idl, null, 2)).toString('base64')}
                            filename={`${programId}-idl.json`}
                            type="application/json"
                        >
                            Download IDL
                        </DownloadableButton>
                    </div>
                </div>
            </div>
            <div className="card-body d-flex justify-content-between align-items-center">
                <IDLBadge spec={spec} />
                <div className="form-check form-switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="expandToggle"
                        onChange={e => setCollapsedValue(e.target.checked ? false : 1)}
                    />
                    <label className="form-check-label" htmlFor="expandToggle">
                        Expand All
                    </label>
                </div>
            </div>

            <div className="card metadata-json-viewer m-4 mt-2">
                <ReactJson
                    src={idl}
                    theme={'solarized'}
                    style={{ padding: 25 }}
                    name={null}
                    enableClipboard={true}
                    collapsed={collapsedValue}
                    displayObjectSize={false}
                    displayDataTypes={false}
                    displayArrayKey={false}
                />
            </div>
        </div>
    );
}
