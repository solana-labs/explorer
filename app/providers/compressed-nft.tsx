import useSWRImmutable from 'swr/immutable';

export function useMetadataJsonLink(url: string) {
    const { data, error } = useSWRImmutable(url, async (url: string) => {
        return fetch(url).then(response => response.json());
    });
    return error ? null : data;
}

export function useCompressedNft({ address, url }: { address: string; url: string }): CompressedNft | null {
    const { data, error } = useSWRImmutable([address, url], async ([address, url]): Promise<CompressedNft | null> => {
        return fetch(`${url}`, {
            body: JSON.stringify({
                id: address,
                jsonrpc: '2.0',
                method: 'getAsset',
                params: {
                    id: address,
                },
            }),
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
        })
            .then(response => response.json())
            .then((response: DasApiResponse<CompressedNft>) => {
                if ('error' in response) {
                    return null;
                }

                return response.result;
            });
    });
    return error ? null : data ?? null;
}

export function useCompressedNftProof({ address, url }: { address: string; url: string }): CompressedNftProof | null {
    const { data, error } = useSWRImmutable([address, url], async ([address, url]) => {
        return fetch(`${url}`, {
            body: JSON.stringify({
                id: address,
                jsonrpc: '2.0',
                method: 'getAssetProof',
                params: {
                    id: address,
                },
            }),
            method: 'POST',
        })
            .then(response => response.json())
            .then((response: DasApiResponse<CompressedNftProof>) => {
                if ('error' in response) {
                    throw new Error(response.error.message);
                }

                return response.result;
            });
    });
    return error ? null : data ?? null;
}

type DasResponseTypes = CompressedNft | CompressedNftProof;
export type DasApiResponse<T extends DasResponseTypes> =
    | {
          jsonrpc: string;
          id: string;
          result: T;
      }
    | {
          jsonrpc: string;
          id: string;
          error: {
              code: number;
              message: string;
          };
      };

export type CompressedNft = {
    interface: string;
    id: string;
    content: {
        $schema: string;
        json_uri: string;
        files: {
            uri: string;
            cdn_uri: string;
            mime: string;
        }[];
        metadata: {
            attributes: {
                value: string;
                trait_type: string;
            }[];
            description: string;
            name: string;
            symbol: string;
            token_standard: string;
        };
        links: {
            external_url: string;
            image: string;
        };
    };
    authorities: {
        address: string;
        scopes: string[];
    }[];
    compression: {
        eligible: boolean;
        compressed: boolean;
        data_hash: string;
        creator_hash: string;
        asset_hash: string;
        tree: string;
        seq: number;
        leaf_id: number;
    };
    grouping: {
        group_key: string;
        group_value: string;
    }[];
    royalty: {
        royalty_model: string;
        target: null;
        percent: number;
        basis_points: number;
        primary_sale_happened: boolean;
        locked: boolean;
    };
    creators: [
        {
            address: string;
            share: number;
            verified: boolean;
        }
    ];
    ownership: {
        frozen: boolean;
        delegated: boolean;
        delegate: string | null;
        ownership_model: string;
        owner: string;
    };
    supply: {
        print_max_supply: number;
        print_current_supply: number;
        edition_nonce: number | null;
    };
    mutable: boolean;
    burnt: boolean;
};

export type CompressedNftProof = {
    root: string;
    proof: string[];
    node_index: number;
    leaf: string;
    tree_id: string;
};
