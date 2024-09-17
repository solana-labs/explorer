import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Account, isTokenProgramData } from '@providers/accounts';
import React from 'react';

import { useCluster } from '@/app/providers/cluster';
import { useCompressedNft } from '@/app/providers/compressed-nft';

interface Attribute {
    trait_type: string;
    value: string;
}

export function MetaplexNFTAttributesCard({ account, onNotFound }: { account?: Account; onNotFound: () => never }) {
    const { url } = useCluster();
    const compressedNft = useCompressedNft({ address: account?.pubkey.toString() ?? '', url });

    const parsedData = account?.data?.parsed;
    if (!parsedData || !isTokenProgramData(parsedData) || parsedData.parsed.type !== 'mint' || !parsedData.nftData) {
        if (compressedNft && compressedNft.compression.compressed) {
            return <NormalMetaplexNFTAttributesCard metadataUri={compressedNft.content.json_uri} />;
        }
        return onNotFound();
    }
    return <NormalMetaplexNFTAttributesCard metadataUri={parsedData.nftData.metadata.data.uri} />;
}

function NormalMetaplexNFTAttributesCard({ metadataUri }: { metadataUri: string }) {
    const [attributes, setAttributes] = React.useState<Attribute[]>([]);
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');

    async function fetchMetadataAttributes() {
        try {
            const response = await fetch(metadataUri);
            const metadata = await response.json();

            // Verify if the attributes value is an array
            if (Array.isArray(metadata.attributes)) {
                // Filter attributes to keep objects matching schema
                const filteredAttributes = metadata.attributes.filter((attribute: any) => {
                    return (
                        typeof attribute === 'object' &&
                        typeof attribute.trait_type === 'string' &&
                        (typeof attribute.value === 'string' || typeof attribute.value === 'number')
                    );
                });

                setAttributes(filteredAttributes);
                setStatus('success');
            } else {
                throw new Error('Attributes is not an array');
            }
        } catch (error) {
            setStatus('error');
        }
    }

    React.useEffect(() => {
        fetchMetadataAttributes();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (status === 'loading') {
        return <LoadingCard />;
    }

    if (status === 'error') {
        return <ErrorCard text="Failed to fetch attributes" />;
    }

    const attributesList: React.ReactNode[] = attributes.map(({ trait_type, value }) => {
        return (
            <tr key={`${trait_type}:${value}`}>
                <td>{trait_type}</td>
                <td>{value}</td>
            </tr>
        );
    });

    return (
        <div className="card">
            <div className="card-header align-items-center">
                <h3 className="card-header-title">Attributes</h3>
            </div>
            <div className="table-responsive mb-0">
                <table className="table table-sm table-nowrap card-table">
                    <thead>
                        <tr>
                            <th className="text-muted w-1">Trait type</th>
                            <th className="text-muted w-1">Value</th>
                        </tr>
                    </thead>
                    <tbody className="list">{attributesList}</tbody>
                </table>
            </div>
        </div>
    );
}
