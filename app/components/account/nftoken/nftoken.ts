import { getRpc } from '@entities/cluster';
import { address, type Base58EncodedBytes, getBase58Decoder, getBase64Encoder } from '@solana/kit';
import pLimit from 'p-limit';

import { fromHex } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

import { NftokenTypes } from './nftoken-types';

const BASE58_DECODER = getBase58Decoder();
const BASE64_ENCODER = getBase64Encoder();

export const NFTOKEN_ADDRESS = 'nftokf9qcHSYkVSP3P2gUMmV6d4AwjMueXgUu43HyLL';

const nftokenAccountDiscInHex = '21b45b35ec0f3f61';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace NftokenFetcher {
    export const getNftsInCollection = async ({
        collection,
        rpcUrl,
    }: {
        collection: string;
        rpcUrl: string;
    }): Promise<NftokenTypes.NftInfo[]> => {
        const accounts = await getRpc(rpcUrl)
            .getProgramAccounts(address(NFTOKEN_ADDRESS), {
                encoding: 'base64',
                // Offsets are typed as bigint, but the BigInt toJSON polyfill in app/types/bigint.ts
                // (loaded by the address layout) turns bigints into JSON strings before kit's
                // serializer can handle them, and the RPC rejects string offsets. Plain numbers
                // serialize correctly either way.
                filters: [
                    {
                        memcmp: {
                            bytes: BASE58_DECODER.decode(fromHex(nftokenAccountDiscInHex)) as Base58EncodedBytes,
                            encoding: 'base58',
                            offset: 0 as unknown as bigint,
                        },
                    },
                    {
                        memcmp: {
                            // authority_can_update
                            bytes: collection as Base58EncodedBytes,
                            encoding: 'base58',
                            offset: (8 + // discriminator
                                1 + // version
                                32 + // holder
                                32 + // authority
                                1) as unknown as bigint,
                        },
                    },
                ],
            })
            .send();

        const parsed_accounts: NftokenTypes.NftAccount[] = accounts.flatMap(account => {
            try {
                const parsed = NftokenTypes.nftAccountDecoder.decode(BASE64_ENCODER.encode(account.account.data[0]));

                return {
                    address: account.pubkey.toString(),
                    authority: parsed.authority,
                    authority_can_update: Boolean(parsed.authority_can_update),
                    collection: parsed.collection,

                    delegate: parsed.delegate,
                    holder: parsed.holder,

                    metadata_url: parsed.metadata_url,
                };
            } catch (e) {
                Logger.error(e);
                return [];
            }
        });

        const metadata_urls = parsed_accounts.map(a => a.metadata_url);
        const metadataMap = await getMetadataMap({ urls: metadata_urls });

        const nfts = parsed_accounts.map(account => ({
            ...account,
            ...metadataMap.get(account.metadata_url),
        }));
        return nfts.sort((a, b) => {
            if (a.name && b.name) {
                return a.name < b.name ? -1 : 1;
            }

            if (a.name) {
                return 1;
            }

            if (b.name) {
                return -1;
            }

            return a.address < b.address ? 1 : -1;
        });
    };

    export const getMetadata = async ({
        url,
    }: {
        url: string | null | undefined;
    }): Promise<NftokenTypes.Metadata | null> => {
        if (!url) {
            return null;
        }

        const metadataMap = await getMetadataMap({
            urls: [url],
        });
        return metadataMap.get(url) ?? null;
    };

    export const getMetadataMap = async ({
        urls: _urls,
    }: {
        urls: Array<string | null | undefined>;
    }): Promise<Map<string, NftokenTypes.Metadata | null>> => {
        const urls = Array.from(new Set(_urls.filter((url): url is string => Boolean(url))));

        const metadataMap = new Map<string, NftokenTypes.Metadata | null>();

        const limit = pLimit(5);
        const promises = urls.map(url =>
            limit(async () => {
                try {
                    const response = await fetch(url, {
                        signal: AbortSignal.timeout(5_000),
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to fetch NFT metadata: ${response.status}`);
                    }
                    const data = await response.json();
                    metadataMap.set(url, {
                        animation_url: data.animation_url ?? null,
                        description: data.description ?? null,
                        external_url: data.external_url ?? null,
                        image: data.image ?? '',
                        name: data.name ?? '',
                        traits: data.traits ?? [],
                    });
                } catch {
                    metadataMap.set(url, null);
                }
            }),
        );
        await Promise.all(promises);

        return metadataMap;
    };
}
