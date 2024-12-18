'use client';

import { IdlCard } from '@components/account/IdlCard';
import { useAnchorProgram } from '@providers/anchor';
import { useCluster } from '@providers/cluster';
import { useIdlFromProgramMetadataProgram } from '@providers/idl';
import { useState } from 'react';

export default function IdlPage({ params: { address } }: { params: { address: string } }) {
    const { url } = useCluster();
    const [activeTab, setActiveTab] = useState<'anchor' | 'metadata'>('anchor');
    const { idl: anchorIdl } = useAnchorProgram(address, url);
    const { idl: metadataIdl } = useIdlFromProgramMetadataProgram(address, url);

    return (
        <div className="card">
            <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                    {anchorIdl && (
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'anchor' ? 'active' : ''}`}
                                onClick={() => setActiveTab('anchor')}
                            >
                                Anchor IDL
                            </button>
                        </li>
                    )}
                    {metadataIdl && (
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'metadata' ? 'active' : ''}`}
                                onClick={() => setActiveTab('metadata')}
                            >
                                Program Metadata IDL
                            </button>
                        </li>
                    )}
                </ul>
            </div>
            <div className="card-body">
                {activeTab === 'anchor' && anchorIdl && (
                    <IdlCard idl={anchorIdl} programId={address} title="Anchor IDL" />
                )}
                {activeTab === 'metadata' && metadataIdl && (
                    <IdlCard idl={metadataIdl} programId={address} title="Anchor IDL (Program metadata)" />
                )}
            </div>
        </div>
    );
}
