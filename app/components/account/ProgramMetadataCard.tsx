'use client';

import { useCluster } from '@providers/cluster';
import { useState } from 'react';
import { ExternalLink } from 'react-feather';
import ReactJson from 'react-json-view';

import { useProgramMetadata } from '@/app/providers/program-metadata';

import { DownloadableButton } from '../common/Downloadable';
import { TableCardBody } from '../common/TableCardBody';

export function ProgramMetadataCard({ programId }: { programId: string }) {
    const { url } = useCluster();
    const programMetaData = useProgramMetadata(programId, url);
    const [collapsedValue, setCollapsedValue] = useState<boolean | number>(1);

    if (!programMetaData) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3 className="card-header-title">No Program Metadata Available</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col">
                        <div className="d-flex align-items-center">
                            {programMetaData.logo && (
                                <img
                                    src={programMetaData.logo}
                                    alt="Program Logo"
                                    className="me-3"
                                    style={{
                                        height: '50px',
                                        objectFit: 'contain',
                                        width: '50px',
                                    }}
                                />
                            )}
                            <h3 className="card-header-title mb-0">{programMetaData.name}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <TableCardBody>
                {programMetaData.description && (
                    <tr>
                        <td className="w-100">Description</td>
                        <td className="text-lg-end">{programMetaData.description}</td>
                    </tr>
                )}

                {programMetaData.notification && (
                    <tr>
                        <td className="w-100">Notification</td>
                        <td className="text-lg-end">{programMetaData.notification}</td>
                    </tr>
                )}

                {programMetaData.version && (
                    <tr>
                        <td className="w-100">Version</td>
                        <td className="text-lg-end font-monospace">{programMetaData.version}</td>
                    </tr>
                )}

                {programMetaData.project_url && (
                    <tr>
                        <td className="w-100">Project URL</td>
                        <td className="text-lg-end">
                            <span className="font-monospace">
                                <a href={programMetaData.project_url} target="_blank" rel="noopener noreferrer">
                                    {programMetaData.project_url}
                                    <ExternalLink className="align-text-top ms-2" size={13} />
                                </a>
                            </span>
                        </td>
                    </tr>
                )}

                {programMetaData.contacts && programMetaData.contacts.length > 0 && (
                    <tr>
                        <td className="w-100">Contacts</td>
                        <td className="text-lg-end">
                            <ul className="list-unstyled mb-0">
                                {programMetaData.contacts.map((contact, index) => (
                                    <li key={index} className="font-monospace">
                                        {contact}
                                    </li>
                                ))}
                            </ul>
                        </td>
                    </tr>
                )}

                {programMetaData.source_code && (
                    <tr>
                        <td className="w-100">Source Code</td>
                        <td className="text-lg-end">
                            <span className="font-monospace">
                                <a href={programMetaData.source_code} target="_blank" rel="noopener noreferrer">
                                    {programMetaData.source_code}
                                    <ExternalLink className="align-text-top ms-2" size={13} />
                                </a>
                            </span>
                        </td>
                    </tr>
                )}

                {programMetaData.source_revision && (
                    <tr>
                        <td className="w-100">Source Revision</td>
                        <td className="text-lg-end font-monospace">{programMetaData.source_revision}</td>
                    </tr>
                )}

                {programMetaData.auditors && (
                    <tr>
                        <td className="w-100">Auditors</td>
                        <td className="text-lg-end">
                            {Array.isArray(programMetaData.auditors) ? (
                                <ul className="list-unstyled mb-0">
                                    {programMetaData.auditors.map((auditor, index) => (
                                        <li key={index} className="font-monospace">
                                            {auditor}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="font-monospace">{programMetaData.auditors}</span>
                            )}
                        </td>
                    </tr>
                )}

                {programMetaData.acknowledgements && (
                    <tr>
                        <td className="w-100">Acknowledgements</td>
                        <td className="text-lg-end font-monospace">{programMetaData.acknowledgements}</td>
                    </tr>
                )}

                {programMetaData.preferred_languages && programMetaData.preferred_languages.length > 0 && (
                    <tr>
                        <td className="w-100">Preferred Languages</td>
                        <td className="text-lg-end">
                            <ul className="list-unstyled mb-0">
                                {programMetaData.preferred_languages.map((language, index) => (
                                    <li key={index} className="font-monospace">
                                        {language}
                                    </li>
                                ))}
                            </ul>
                        </td>
                    </tr>
                )}

                {programMetaData.encryption && (
                    <tr>
                        <td className="w-100">Encryption</td>
                        <td className="text-lg-end font-monospace">{programMetaData.encryption}</td>
                    </tr>
                )}

                {programMetaData.expiry && (
                    <tr>
                        <td className="w-100">Expiry</td>
                        <td className="text-lg-end font-monospace">{programMetaData.expiry}</td>
                    </tr>
                )}
            </TableCardBody>

            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col">
                        <h3 className="card-header-title">Program Metadata (from Program Metadata PDA)</h3>
                    </div>
                    <div className="col-auto btn btn-sm btn-primary d-flex align-items-center">
                        <DownloadableButton
                            data={Buffer.from(JSON.stringify(programMetaData, null, 2)).toString('base64')}
                            filename={`${programId}-metadata.json`}
                            type="application/json"
                        >
                            Download Program Metadata
                        </DownloadableButton>
                    </div>
                </div>
            </div>
            <div className="card-body d-flex justify-content-between align-items-center">
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
                    src={programMetaData}
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
