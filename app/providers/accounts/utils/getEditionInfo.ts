import { deserializeEdition, deserializeMasterEdition, Edition, fetchMasterEdition, findMasterEditionPda, Key, MasterEdition, Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { Connection } from '@solana/web3.js';

export type EditionInfo = {
    masterEdition?: MasterEdition;
    edition?: Edition;
};

export default async function getEditionInfo(
    metadata: Metadata,
    connection: Connection
): Promise<EditionInfo> {
    const umi = createUmi(connection.rpcEndpoint);
    const editionPda = findMasterEditionPda(umi, { mint: metadata.mint });
    try {
        const edition = await umi.rpc.getAccount(publicKey(editionPda));

        if (edition.exists) {
            if (edition.data[0] === Key.MasterEditionV1 || edition.data[0] === Key.MasterEditionV2) {
                return {
                    edition: undefined,
                    masterEdition: deserializeMasterEdition(edition),
                };
            } else if (edition.data[0] === Key.EditionV1) {
                const editionData = deserializeEdition(edition);
                return {
                    edition: editionData,
                    masterEdition: await fetchMasterEdition(umi, editionData.parent),
                };
            }
        }
    } catch {
        /* ignore */
    }

    return {
        edition: undefined,
        masterEdition: undefined,
    };
}
