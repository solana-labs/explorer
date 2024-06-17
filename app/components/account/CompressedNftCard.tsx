import { Account } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import { createRef, Suspense } from 'react';
import { ChevronDown, ExternalLink } from 'react-feather';
import useAsyncEffect from 'use-async-effect';

import { useCluster } from '@/app/providers/cluster';
import { CompressedNft, useCompressedNft, useMetadataJsonLink } from '@/app/providers/compressed-nft';

import { Address } from '../common/Address';
import { InfoTooltip } from '../common/InfoTooltip';
import { LoadingArtPlaceholder } from '../common/LoadingArtPlaceholder';
import { ArtContent } from '../common/NFTArt';
import { TableCardBody } from '../common/TableCardBody';
import { getCreatorDropdownItems, getIsMutablePill, getVerifiedCollectionPill } from './MetaplexNFTHeader';
import { UnknownAccountCard } from './UnknownAccountCard';

export function CompressedNftCard({ account }: { account: Account }) {
    const { url } = useCluster();
    const compressedNft = useCompressedNft({ address: account.pubkey.toString(), url });
    if (!compressedNft) return <UnknownAccountCard account={account} />;

    const collectionGroup = compressedNft.grouping.find(group => group.group_key === 'collection');
    const updateAuthority = compressedNft.authorities.find(authority => authority.scopes.includes('full'))?.address;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title mb-0 d-flex align-items-center">Overview</h3>
            </div>
            <TableCardBody>
                <tr>
                    <td>Address</td>
                    <td className="text-lg-end">
                        <Address pubkey={account.pubkey} alignRight raw />
                    </td>
                </tr>
                <tr>
                    <td>Verified Collection Address</td>
                    <td className="text-lg-end">
                        {collectionGroup ? (
                            <Address pubkey={new PublicKey(collectionGroup.group_value)} alignRight link />
                        ) : (
                            'None'
                        )}
                    </td>
                </tr>
                <tr>
                    <td>Update Authority</td>
                    <td className="text-lg-end">
                        {updateAuthority ? <Address pubkey={new PublicKey(updateAuthority)} alignRight link /> : 'None'}
                    </td>
                </tr>
                <tr>
                    <td>Website</td>
                    <td className="text-lg-end">
                        <a rel="noopener noreferrer" target="_blank" href={compressedNft.content.links.external_url}>
                            {compressedNft.content.links.external_url}
                            <ExternalLink className="align-text-top ms-2" size={13} />
                        </a>
                    </td>
                </tr>
                <tr>
                    <td>Seller Fee</td>
                    <td className="text-lg-end">{`${compressedNft.royalty.basis_points / 100}%`}</td>
                </tr>
            </TableCardBody>
        </div>
    );
}

export function CompressedNftAccountHeader({ account }: { account: Account }) {
    const { url } = useCluster();
    const compressedNft = useCompressedNft({ address: account.pubkey.toString(), url });

    if (compressedNft) {
        return (
            <Suspense fallback={<LoadingArtPlaceholder />}>
                <CompressedNFTHeader compressedNft={compressedNft} />
            </Suspense>
        );
    }
    return <div />;
}

export function CompressedNFTHeader({ compressedNft }: { compressedNft: CompressedNft }) {
    const metadataJson = useMetadataJsonLink(compressedNft.content.json_uri);
    const dropdownRef = createRef<HTMLButtonElement>();

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

    return (
        <div className="row">
            <div className="col-auto ms-2 d-flex align-items-center">
                <ArtContent pubkey={compressedNft.id} data={metadataJson} />
            </div>
            <div className="col mb-3 ms-0.5 mt-3">
                {<h6 className="header-pretitle ms-1">Metaplex Compressed NFT</h6>}
                <div className="d-flex align-items-center">
                    <h2 className="header-title ms-1 align-items-center no-overflow-with-ellipsis">
                        {compressedNft.content.metadata.name !== ''
                            ? compressedNft.content.metadata.name
                            : 'No NFT name was found'}
                    </h2>
                    {getVerifiedCollectionPill()}
                </div>
                <h4 className="header-pretitle ms-1 mt-1 no-overflow-with-ellipsis">
                    {compressedNft.content.metadata.symbol !== ''
                        ? compressedNft.content.metadata.symbol
                        : 'No Symbol was found'}
                </h4>
                <div className="mb-2 mt-2">{getCompressedNftPill()}</div>
                <div className="mb-3 mt-2">{getIsMutablePill(compressedNft.mutable)}</div>
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
                    <div className="dropdown-menu mt-2">{getCreatorDropdownItems(compressedNft.creators)}</div>
                </div>
            </div>
        </div>
    );
}

function getCompressedNftPill() {
    const onchainVerifiedToolTip =
        'This NFT does not have a corresponding account, but uses verified ledger data to allow for transfers and trades. The existence of this tag ensures that the compressed NFT is verifiably up-to-date with the chain.';
    return (
        <div className={'d-inline-flex align-items-center ms-2'}>
            <span className="badge badge-pill bg-dark">{'Compressed'}</span>
            <InfoTooltip bottom text={onchainVerifiedToolTip} />
        </div>
    );
}
