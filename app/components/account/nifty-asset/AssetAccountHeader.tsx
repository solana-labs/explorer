import { InfoTooltip } from '@components/common/InfoTooltip';
import { ArtContent } from '@components/common/NFTArt';
import {
    Asset,
    Blob,
    Creator,
    ExtensionType,
    Standard,
    getAssetAccountDataSerializer,
    getExtension,
} from '@nifty-oss/asset';
import { Account } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React, { Suspense, createRef, useState } from 'react';
import { AlertOctagon, Check, ChevronDown } from 'react-feather';
import useAsyncEffect from 'use-async-effect';
import { LoadingArtPlaceholder } from '../../common/LoadingArtPlaceholder';
import { KNOWN_IMAGE_EXTENSIONS } from './types';

export function NiftyAssetAccountHeader({ account }: { account: Account }) {
    const data = account.data.raw;
    const asset = data && getAssetAccountDataSerializer().deserialize(data);

    if (asset) {
        return (
            <Suspense fallback={<LoadingArtPlaceholder />}>
                <NiftyAssetHeader address={account.pubkey} asset={asset[0] as Asset} />
            </Suspense>
        );
    }

    return (
        <>
            <h6 className="header-pretitle">Details</h6>
            <h2 className="header-title">Account</h2>
        </>
    );
}

export function NiftyAssetHeader({ address, asset }: { address: PublicKey; asset: Asset }) {
    // check for blob

    const blob = getExtension(asset, ExtensionType.Blob);
    let hasOnChainImage = false;

    if (blob) {
        hasOnChainImage = KNOWN_IMAGE_EXTENSIONS.includes(blob.contentType);
    }

    // check for metadata

    const metadata = getExtension(asset, ExtensionType.Metadata);
    const [image, setImage] = useState(null);
    const [onChainImage, setOnChainImage] = useState(false);

    async function fetchMetadataImage(uri: string) {
        try {
            const response = await fetch(uri);
            const metadata = await response.json();
            setImage(metadata.image);
        } catch (error) {
            setOnChainImage(hasOnChainImage);
        }
    }

    if (metadata?.uri && metadata.uri.length > 0) {
        React.useEffect(() => {
            fetchMetadataImage(metadata.uri);
        }, []); // eslint-disable-line react-hooks/exhaustive-deps
    } else {
        React.useEffect(() => {
            setOnChainImage(hasOnChainImage);
        }, []); // eslint-disable-line react-hooks/exhaustive-deps
    }

    // check for creators

    const creators = getExtension(asset, ExtensionType.Creators);
    const dropdownRef = createRef<HTMLButtonElement>();

    if (creators) {
        useAsyncEffect(
            async isMounted => {
                if (!dropdownRef.current) {
                    return;
                }
                const Dropdown = (await import('bootstrap/js/dist/dropdown')).default;
                if (!isMounted || !dropdownRef.current) {
                    return;
                }
                return new Dropdown(dropdownRef.current);
            },
            dropdown => {
                if (dropdown) {
                    dropdown.dispose();
                }
            },
            [dropdownRef]
        );
    }

    // check for grouping

    const grouping = getExtension(asset, ExtensionType.Grouping);

    return (
        <div className="row">
            {image && (
                <div className="col-auto ms-2 d-flex align-items-center">
                    <ArtContent pubkey={address} uri={image} data={undefined} />
                </div>
            )}
            {onChainImage && (
                <div className="col-auto ms-2 d-flex align-items-center">
                    <OnChainImageContent extension={blob!} />
                </div>
            )}
            <div className="col mb-3 ms-0.5 mt-3">
                {<h6 className="header-pretitle ms-1">ASSET</h6>}
                <div className="d-flex align-items-center">
                    <h2 className="header-title ms-1 align-items-center no-overflow-with-ellipsis">{asset.name}</h2>
                    {getStandardPill(asset.standard)}
                    {grouping ? getGroupPill() : null}
                </div>
                <h4 className="header-pretitle ms-1 mt-1 no-overflow-with-ellipsis">
                    {metadata && metadata.symbol !== '' && metadata.symbol}
                </h4>
                <div className="mb-3 mt-2">{getIsMutablePill(asset.mutable)}</div>
                {creators && (
                    <div className="btn-group">
                        <button
                            className="btn btn-dark btn-sm creators-dropdown-button-width"
                            type="button"
                            aria-haspopup="true"
                            aria-expanded="false"
                            data-bs-toggle="dropdown"
                            ref={dropdownRef}
                        >
                            Creators <ChevronDown size={15} className="align-text-top" />
                        </button>
                        <div className="dropdown-menu mt-2">{getCreatorDropdownItems(creators.values)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function getCreatorDropdownItems(creators: Creator[] | null) {
    const CreatorHeader = () => {
        const creatorTooltip = 'Verified creators signed the metadata associated with this asset when it was created.';

        const shareTooltip = 'The percentage of the proceeds a creator receives when this asset is sold.';

        return (
            <div className={'d-flex align-items-center dropdown-header creator-dropdown-entry'}>
                <div className="d-flex font-monospace creator-dropdown-header">
                    <span>Creator Address</span>
                    <InfoTooltip bottom text={creatorTooltip} />
                </div>
                <div className="d-flex font-monospace">
                    <span className="font-monospace">Royalty</span>
                    <InfoTooltip bottom text={shareTooltip} />
                </div>
            </div>
        );
    };

    const getVerifiedIcon = (isVerified: boolean) => {
        return isVerified ? <Check className="ms-3" size={15} /> : <AlertOctagon className="me-3" size={15} />;
    };

    const CreatorEntry = (creator: Creator) => {
        const creatorPath = useClusterPath({ pathname: `/address/${creator.address}` });
        return (
            <div className={'d-flex align-items-center font-monospace creator-dropdown-entry ms-3 me-3'}>
                {getVerifiedIcon(creator.verified)}
                <Link
                    className="dropdown-item small-font-size font-monospace creator-dropdown-entry-address"
                    href={creatorPath}
                >
                    {creator.address}
                </Link>
                <div className="me-3"> {`${creator.share}%`}</div>
            </div>
        );
    };

    if (creators && creators.length > 0) {
        const listOfCreators: JSX.Element[] = [];

        listOfCreators.push(<CreatorHeader key={'header'} />);
        creators.forEach(creator => {
            listOfCreators.push(<CreatorEntry key={creator.address} {...creator} />);
        });

        return listOfCreators;
    }

    return (
        <div className={'dropdown-item font-monospace'}>
            <div className="me-3">No creators are associated with this asset.</div>
        </div>
    );
}

function getStandardPill(standard: Standard) {
    if (standard == Standard.NonFungible) {
        return null;
    } else {
        return (
            <div className={'d-inline-flex ms-2'}>
                <span className="badge badge-pill bg-gray-soft">{`${
                    standard === Standard.Soulbound
                        ? 'SOULBOUND'
                        : standard === Standard.Managed
                        ? 'MANAGED'
                        : 'PROXIED'
                }`}</span>
            </div>
        );
    }
}

function getIsMutablePill(mutable: boolean) {
    return <span className="badge badge-pill bg-dark">{`${mutable ? 'Mutable' : 'Immutable'}`}</span>;
}

function getGroupPill() {
    const onchainGroupToolTip = 'This asset represents an on-chain group.';
    return (
        <div className={'d-inline-flex align-items-center ms-2'}>
            <span className="badge badge-pill bg-gray-soft">{'GROUP'}</span>
            <InfoTooltip bottom text={onchainGroupToolTip} />
        </div>
    );
}

export const OnChainImageContent = ({ extension }: { extension: { type: ExtensionType.Blob } & Blob }) => {
    const base64String = Buffer.from(extension.data).toString('base64');
    const onchainGroupToolTip = 'This image is stored on the asset account.';

    return (
        <div className="justify-content-center" style={{ maxHeight: 200, width: 150 }}>
            <div className={`rounded mx-auto d-block`} style={{ overflow: 'hidden' }}>
                <img src={`data:${extension.contentType};base64,${base64String}`} width="100%" alt="on-chain image" />
            </div>
            <h5 className="mt-1">
                <span className="badge badge-pill w-100 bg-gray-soft">ON-CHAIN IMAGE</span>
            </h5>
        </div>
    );
};
