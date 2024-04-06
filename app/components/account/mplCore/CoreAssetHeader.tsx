import { InfoTooltip } from '@components/common/InfoTooltip';
import { ArtContent } from '@components/common/NFTArt';
import { AssetV1, deserializeAssetV1 } from '@metaplex-foundation/mpl-core';
// import { Creator } from '@metaplex-foundation/mpl-token-metadata';
// import { isSome } from '@metaplex-foundation/umi';
import * as Umi from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { Account } from '@providers/accounts';
// import { useClusterPath } from '@utils/url';
// import Link from 'next/link';
import React, { useEffect }/*, { createRef }*/ from 'react';
// import { /*AlertOctagon, Check, */ChevronDown } from 'react-feather';
// import useAsyncEffect from 'use-async-effect';

export function CoreAssetHeader({ account }: { account: Account }) {
    const [asset, setAsset] = React.useState<AssetV1 | null>(null);
    const [json, setJson] = React.useState<any | null>(null);

    useEffect(() => {
        const rpcAccount: Umi.RpcAccount = {
            data: Uint8Array.from(account.data.raw || new Uint8Array()),
            executable: account.executable,
            lamports: Umi.lamports(account.lamports),
            owner: fromWeb3JsPublicKey(account.owner),
            publicKey: fromWeb3JsPublicKey(account.pubkey),
        };

        setAsset(deserializeAssetV1(rpcAccount));
    }, [account]);
    // const collection = asset?.updateAuthority;
    let collectionAddress: Umi.PublicKey | null = null;
    if (asset?.updateAuthority.type === 'Collection') {
        collectionAddress = asset?.updateAuthority.address || null;
    }

    useEffect(() => {
        const fetchUri = async () => {
            const data = await fetch(asset?.uri || "");
            setJson(await data.json());
        };
        fetchUri();
    }, [asset?.uri]);

    // const dropdownRef = createRef<HTMLButtonElement>();
    // useAsyncEffect(
    //     async isMounted => {
    //         if (!dropdownRef.current) {
    //             return;
    //         }
    //         const Dropdown = (await import('bootstrap/js/dist/dropdown')).default;
    //         if (!isMounted || !dropdownRef.current) {
    //             return;
    //         }
    //         return new Dropdown(dropdownRef.current);
    //     },
    //     dropdown => {
    //         if (dropdown) {
    //             dropdown.dispose();
    //         }
    //     },
    //     [dropdownRef]
    // );
    return (
        <div className="row">
            <div className="col-auto ms-2 d-flex align-items-center">
                <ArtContent pubkey={asset?.publicKey} data={json} />
            </div>
            <div className="col mb-3 ms-0.5 mt-3">
                {<h6 className="header-pretitle ms-1">Metaplex NFT</h6>}
                <div className="d-flex align-items-center">
                    <h2 className="header-title ms-1 align-items-center no-overflow-with-ellipsis">
                        {asset?.name !== '' ? asset?.name : 'No NFT name was found'}
                    </h2>
                    {collectionAddress ? getVerifiedCollectionPill() : null}
                </div>
                <div className="mb-3 mt-2">{getIsMutablePill(asset?.updateAuthority.type !== "None")}</div>
                <div className="btn-group">
                    {/* <button
                        className="btn btn-dark btn-sm creators-dropdown-button-width"
                        type="button"
                        aria-haspopup="true"
                        aria-expanded="false"
                        data-bs-toggle="dropdown"
                        ref={dropdownRef}
                    >
                        Creators <ChevronDown size={15} className="align-text-top" />
                    </button> */}
                    {/* <div className="dropdown-menu mt-2">{getCreatorDropdownItems(isSome(metadata.creators) ? metadata.creators.value : [])}</div> */}
                </div>
            </div>
        </div>
    );
}

// function getCreatorDropdownItems(creators: Creator[] | null) {
//     const CreatorHeader = () => {
//         const creatorTooltip = 'Verified creators signed the metadata associated with this NFT when it was created.';

//         const shareTooltip = 'The percentage of the proceeds a creator receives when this NFT is sold.';

//         return (
//             <div className={'d-flex align-items-center dropdown-header creator-dropdown-entry'}>
//                 <div className="d-flex font-monospace creator-dropdown-header">
//                     <span>Creator Address</span>
//                     <InfoTooltip bottom text={creatorTooltip} />
//                 </div>
//                 <div className="d-flex font-monospace">
//                     <span className="font-monospace">Royalty</span>
//                     <InfoTooltip bottom text={shareTooltip} />
//                 </div>
//             </div>
//         );
//     };

//     const getVerifiedIcon = (isVerified: boolean) => {
//         return isVerified ? <Check className="ms-3" size={15} /> : <AlertOctagon className="me-3" size={15} />;
//     };

//     const CreatorEntry = (creator: Creator) => {
//         const creatorPath = useClusterPath({ pathname: `/address/${creator.address}` });
//         return (
//             <div className={'d-flex align-items-center font-monospace creator-dropdown-entry ms-3 me-3'}>
//                 {getVerifiedIcon(creator.verified)}
//                 <Link className="dropdown-item font-monospace creator-dropdown-entry-address" href={creatorPath}>
//                     {creator.address}
//                 </Link>
//                 <div className="me-3"> {`${creator.share}%`}</div>
//             </div>
//         );
//     };

//     if (creators && creators.length > 0) {
//         const listOfCreators: JSX.Element[] = [];

//         listOfCreators.push(<CreatorHeader key={'header'} />);
//         creators.forEach(creator => {
//             listOfCreators.push(<CreatorEntry key={creator.address} {...creator} />);
//         });

//         return listOfCreators;
//     }

//     return (
//         <div className={'dropdown-item font-monospace'}>
//             <div className="me-3">No creators are associated with this NFT.</div>
//         </div>
//     );
// }

// function getEditionPill(editionInfo: EditionInfo) {
//     const masterEdition = editionInfo.masterEdition;
//     const edition = editionInfo.edition;

//     return (
//         <div className={'d-inline-flex ms-2'}>
//             <span className="badge badge-pill bg-dark">{`${edition && masterEdition
//                 ? `Edition ${Number(edition.edition)} / ${Number(masterEdition.supply)}`
//                 : masterEdition
//                     ? 'Master Edition'
//                     : 'No Master Edition Information'
//                 }`}</span>
//         </div>
//     );
// }

// function getSaleTypePill(hasPrimarySaleHappened: boolean) {
//     const primaryMarketTooltip = 'Creator(s) split 100% of the proceeds when this NFT is sold.';

//     const secondaryMarketTooltip =
//         'Creator(s) split the Seller Fee when this NFT is sold. The owner receives the remaining proceeds.';

//     return (
//         <div className={'d-inline-flex align-items-center'}>
//             <span className="badge badge-pill bg-dark">{`${hasPrimarySaleHappened ? 'Secondary Market' : 'Primary Market'
//                 }`}</span>
//             <InfoTooltip bottom text={hasPrimarySaleHappened ? secondaryMarketTooltip : primaryMarketTooltip} />
//         </div>
//     );
// }

function getIsMutablePill(isMutable: boolean) {
    return <span className="badge badge-pill bg-dark">{`${isMutable ? 'Mutable' : 'Immutable'}`}</span>;
}

function getVerifiedCollectionPill() {
    const onchainVerifiedToolTip =
        'This NFT has been verified as a member of an on-chain collection. This tag guarantees authenticity.';
    return (
        <div className={'d-inline-flex align-items-center ms-2'}>
            <span className="badge badge-pill bg-dark">{'Verified Collection'}</span>
            <InfoTooltip bottom text={onchainVerifiedToolTip} />
        </div>
    );
}
