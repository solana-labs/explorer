'use client';

import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import ReactJson from 'react-json-view';

export function AnchorProgramCard({ programId }: { programId: string }) {
    const { url } = useCluster();
    const program = useAnchorProgram(programId, url);

    if (!program) {
        return null;
    }

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="card-header-title">Anchor IDL</h3>
                        </div>
                    </div>
                </div>

                <div className="card metadata-json-viewer m-4">
                    <ReactJson src={program.idl} theme={'solarized'} style={{ padding: 25 }} collapsed={1} />
                </div>
            </div>
        </>
    );
}
