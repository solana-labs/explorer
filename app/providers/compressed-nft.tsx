type CacheType<P> = Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: P }
>;

const cachedNftPromises: CacheType<CompressedNft | null> = {};

const cachedPromises = {
    compressedNft: {} as CacheType<CompressedNft | null>,
    nftMetadataJson: {} as CacheType<any>,
};

function makeCache<Params, CacheValueType>(
    cacheName: keyof typeof cachedPromises,
    keygen: (params: Params) => string,
    action: (params: Params) => Promise<CacheValueType>
): (params: Params) => CacheValueType {
    return (params: Params) => {
        const key = keygen(params);
        const cacheEntry = cachedPromises[cacheName][key];

        if (cacheEntry === undefined) {
            const promise = action(params)
                .then((value: CacheValueType) => {
                    cachedPromises[cacheName][key] = {
                        __type: 'result',
                        result: value,
                    };
                })
                .catch(_ => {
                    cachedNftPromises[key] = { __type: 'result', result: null };
                });
            cachedPromises[cacheName][key] = {
                __type: 'promise',
                promise,
            };
            throw promise;
        } else if (cacheEntry.__type === 'promise') {
            throw cacheEntry.promise;
        }
        return cacheEntry.result;
    };
}

export const useMetadataJsonLink = makeCache<string, any>(
    'nftMetadataJson',
    (url: string) => url,
    async (url: string) => {
        return fetch(url).then(response => response.json());
    }
);

export const useCompressedNft = makeCache<{ address: string; url: string }, CompressedNft | null>(
    'compressedNft',
    ({ address, url }) => `${address}-${url}`,
    async ({ address, url }) => {
        return fetch(`${url}`, {
            body: JSON.stringify({
                id: address,
                jsonrpc: '2.0',
                method: 'getAsset',
                params: {
                    id: address,
                },
            }),
            method: 'POST',
        })
            .then(response => response.json())
            .then((response: DasApiResponse) => {
                if ('error' in response) {
                    throw new Error(response.error.message);
                }

                return response.result as CompressedNft;
            });
    }
);

export type DasApiResponse =
    | {
          jsonrpc: string;
          id: string;
          result: CompressedNft;
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
