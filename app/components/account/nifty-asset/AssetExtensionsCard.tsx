'use client';

import { useClusterPath } from '@/app/utils/url';
import { TableCardBody } from '@components/common/TableCardBody';
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { Asset, ExtensionType, OperatorType, getExtension } from '@nifty-oss/asset';
import Link from 'next/link';
import { AlertOctagon, Check, ExternalLink } from 'react-feather';
import { Address } from '../../common/Address';
import { Copyable } from '../../common/Copyable';
import { InfoTooltip } from '../../common/InfoTooltip';
import { getDelegateRolePills } from './AssetAccountCard';
import { KNOWN_IMAGE_EXTENSIONS } from './types';
import { PublicKey } from '@solana/web3.js';
import { HexData } from '../../common/HexData';

export function NiftyAssetExtensionsCard({ asset }: { asset: Asset }) {
    return (
        <div className="card">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Extensions</h3>
            </div>
            {getAttributes(asset)}
            {getBlob(asset)}
            {getCreators(asset)}
            {getGrouping(asset)}
            {getLinks(asset)}
            {getManager(asset)}
            {getMetadata(asset)}
            {getProxy(asset)}
            {getRoyalties(asset)}
        </div>
    );
}

function getManager(asset: Asset) {
    const manager = getExtension(asset, ExtensionType.Manager);

    if (!manager) {
        return null;
    }

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Manager</h3>
            </div>

            <div className="table-responsive mb-0">
                <table className="table table-sm card-table">
                    <tbody className="list">
                        <tr>
                            <td>Delegate {manager.delegate && getDelegateRolePills(manager.delegate)}</td>
                            <td className="text-lg-end">
                                {manager.delegate ? (
                                    <Address pubkey={toWeb3JsPublicKey(manager.delegate.address!)} alignRight link />
                                ) : (
                                    <div className="text-muted">None</div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function getMetadata(asset: Asset) {
    const metadata = getExtension(asset, ExtensionType.Metadata);

    if (!metadata) {
        return null;
    }

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Metadata</h3>
            </div>

            <div className="table-responsive mb-0">
                <table className="table table-sm card-table">
                    <tbody className="list">
                        <tr>
                            <td className="text-muted">Symbol</td>
                            {metadata.symbol.length > 0 ? (
                                <td className="text-lg-end">{metadata.symbol}</td>
                            ) : (
                                <td className="text-muted text-lg-end">None</td>
                            )}
                        </tr>
                        <tr>
                            <td className="align-top text-muted">Description</td>
                            {metadata.description.length > 0 ? (
                                <td className="w-50 text-lg-end">{metadata.description}</td>
                            ) : (
                                <td className="text-muted text-lg-end">None</td>
                            )}
                        </tr>
                        <tr>
                            <td className="text-muted">URI</td>
                            <td className="text-lg-end">
                                {metadata.uri.length > 0 ? (
                                    <a rel="noopener noreferrer" target="_blank" href={metadata.uri}>
                                        {metadata.uri}
                                        <ExternalLink className="align-text-top ms-2" size={13} />
                                    </a>
                                ) : (
                                    <div className="text-muted text-lg-end">None</div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function getGrouping(asset: Asset) {
    const grouping = getExtension(asset, ExtensionType.Grouping);

    if (!grouping) {
        return null;
    }

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Grouping</h3>
            </div>

            <TableCardBody>
                <tr>
                    <td className="text-muted">Size</td>
                    <td className="text-lg-end">{grouping.size.toString()}</td>
                </tr>
                <tr>
                    <td className="text-muted">Maximum Size</td>
                    <td className="text-lg-end">
                        {grouping.maxSize === 0n ? (
                            <h3 className="mb-0">
                                <span className="badge badge-pill bg-info-soft">Unlimited</span>
                            </h3>
                        ) : (
                            grouping.maxSize.toString()
                        )}
                    </td>
                </tr>
                <tr>
                    <td className="text-muted">Delegate</td>
                    <td className="text-lg-end">
                        {grouping.delegate ? (
                            <Address pubkey={toWeb3JsPublicKey(grouping.delegate)} alignRight link />
                        ) : (
                            <div className="text-muted text-lg-end">None</div>
                        )}
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
}

function getLinks(asset: Asset) {
    const links = getExtension(asset, ExtensionType.Links);

    if (!links) {
        return null;
    }

    const renderLinkRows = () => {
        const linkRows: JSX.Element[] = [];

        links.values.forEach(({ name, uri }) => {
            linkRows.push(
                <tr>
                    <td className="text-muted">{name}</td>
                    <td className="text-lg-end">
                        <a rel="noopener noreferrer" target="_blank" href={uri}>
                            {uri}
                            <ExternalLink className="align-text-top ms-2" size={13} />
                        </a>
                    </td>
                </tr>
            );
        });

        return linkRows;
    };

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Links</h3>
            </div>
            <TableCardBody>{renderLinkRows()}</TableCardBody>
        </div>
    );
}

function getAttributes(asset: Asset) {
    const attributes = getExtension(asset, ExtensionType.Attributes);

    if (!attributes) {
        return null;
    }

    const renderAttributeRows = () => {
        const attributeRows: JSX.Element[] = [];

        attributes.traits.forEach(({ traitType, value }) => {
            attributeRows.push(
                <tr>
                    <td className="text-muted">{traitType}</td>
                    <td className="text-lg-end">{value}</td>
                </tr>
            );
        });

        return attributeRows;
    };

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Attributes</h3>
            </div>
            <TableCardBody>{renderAttributeRows()}</TableCardBody>
        </div>
    );
}

function getBlob(asset: Asset) {
    const blob = getExtension(asset, ExtensionType.Blob);

    if (!blob) {
        return null;
    }

    const base64String = Buffer.from(blob.data).toString('base64');
    const knownType = KNOWN_IMAGE_EXTENSIONS.includes(blob.contentType);

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Blob</h3>
            </div>
            <TableCardBody>
                {knownType && (
                    <tr>
                        <td>
                            <div style={{ maxHeight: 200, width: 150 }}>
                                <div className={`rounded mx-auto 'd-block'`} style={{ overflow: 'hidden' }}>
                                    <img
                                        src={`data:${blob.contentType};base64,${base64String}`}
                                        width="100%"
                                        alt="on-chain image"
                                    />
                                </div>
                            </div>
                        </td>
                        <td className="text-lg-end">&nbsp;</td>
                    </tr>
                )}
                <tr>
                    <td className="text-muted">Content-type</td>
                    <td className="text-lg-end">{blob.contentType}</td>
                </tr>
                <tr>
                    <td className="text-muted">Data Size</td>
                    <td className="text-lg-end">{blob.data.length} byte(s)</td>
                </tr>
            </TableCardBody>
        </div>
    );
}

function getCreators(asset: Asset) {
    const creators = getExtension(asset, ExtensionType.Creators);

    if (!creators) {
        return null;
    }

    const renderCreatorsRows = () => {
        const creatorRows: JSX.Element[] = [];

        creatorRows.push(
            <tr>
                <td className="text-muted">Verified</td>
                <td className="text-muted">Address</td>
                <td className="text-muted text-lg-end me-3">Share</td>
            </tr>
        );

        creators.creators.forEach(({ address, verified, share }) => {
            const creatorPath = useClusterPath({ pathname: `/address/${address}` });
            creatorRows.push(
                <tr>
                    <td>
                        {verified ? <Check className="ms-3" size={15} /> : <AlertOctagon className="me-3" size={15} />}
                    </td>
                    <td>
                        <Address pubkey={toWeb3JsPublicKey(address)} link />
                    </td>
                    <td className="text-lg-end me-3">{`${share}%`}</td>
                </tr>
            );
        });

        return creatorRows;
    };

    const creatorTooltip = 'Verified creators signed the metadata associated with this asset when it was created.';

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Creators</h3>
                <InfoTooltip bottom text={creatorTooltip} />
            </div>
            <TableCardBody>{renderCreatorsRows()}</TableCardBody>
        </div>
    );
}

function getRoyalties(asset: Asset) {
    const royalties = getExtension(asset, ExtensionType.Royalties);

    if (!royalties) {
        return null;
    }

    const addressPath = useClusterPath({ pathname: `/address/${asset.publicKey.toString()}/nifty-asset-ruleset` });

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Royalties</h3>
            </div>

            <TableCardBody>
                <tr>
                    <td className="text-muted">Seller Fee</td>
                    <td className="text-lg-end">{`${Number(royalties.basisPoints) / 100}%`}</td>
                </tr>
                <tr>
                    <td className="text-muted">Constraint</td>
                    <td className="text-lg-end">
                        {royalties.constraint.type === 'Empty' ? (
                            <h3 className="mb-0">
                                <span className="badge badge-pill bg-info-soft">
                                    {royalties.constraint.type.toString()}
                                </span>
                            </h3>
                        ) : (
                            <Copyable text={asset.publicKey.toString()} replaceText={false}>
                                <Link href={addressPath}>Rule Set</Link>
                            </Copyable>
                        )}
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
}

function getProxy(asset: Asset) {
    const proxy = getExtension(asset, ExtensionType.Proxy);

    if (!proxy) {
        return null;
    }

    return (
        <div className="inner-cards">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Proxy</h3>
            </div>

            <TableCardBody>
                <tr>
                    <td className="text-muted">Program</td>
                    <td className="text-lg-end">
                        <Address pubkey={toWeb3JsPublicKey(proxy.program)} alignRight link />
                    </td>
                </tr>
                <tr>
                    <td className="text-muted">Seeds (Hex)</td>
                    <td className="text-lg-end">
                        <HexData raw={Buffer.from(proxy.seeds)} />
                    </td>
                </tr>
                <tr>
                    <td className="text-muted">Bump</td>
                    <td className="text-lg-end">{proxy.bump}</td>
                </tr>
                <tr>
                    <td className="text-muted">Authority</td>
                    <td className="text-lg-end">
                        {proxy.authority ? (
                            <Address pubkey={toWeb3JsPublicKey(proxy.authority)} alignRight link />
                        ) : (
                            <div className="text-muted text-lg-end">None</div>
                        )}
                    </td>
                </tr>
            </TableCardBody>
        </div>
    );
}
