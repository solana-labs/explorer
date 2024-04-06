import { AssetV1, CollectionV1, deserializeAssetV1, deserializeCollectionV1, Key, MPL_CORE_PROGRAM_ID } from '@metaplex-foundation/mpl-core';
import { lamports, RpcAccount } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

import { Account } from '../../../providers/accounts';

export function isCoreAccount(account: Account): boolean {
    console.log("Checking for Core account");
    return Boolean(account.owner.toString() === MPL_CORE_PROGRAM_ID.toString() && account.data.raw);
}

export const parseCoreNFTAccount = (account: Account): AssetV1 | null => {
    if (!isCoreAccount(account)) {
        return null;
    }

    try {
        if (account.data.raw && account.data.raw[0] !== Key.AssetV1) {
            const rpcAccount: RpcAccount = {
                data: Uint8Array.from(account.data.raw),
                executable: account.executable,
                lamports: lamports(account.lamports),
                owner: fromWeb3JsPublicKey(account.owner),
                publicKey: fromWeb3JsPublicKey(account.pubkey),
            };

            return deserializeAssetV1(rpcAccount);
        } else {
            return null;
        }
    } catch (e) {
        console.error('Problem parsing Core NFT...', e);
        return null;
    }
};

export const parseCoreCollectionAccount = (account: Account): CollectionV1 | null => {
    if (!isCoreAccount(account)) {
        return null;
    }

    try {
        if (account.data.raw && account.data.raw[0] !== Key.CollectionV1) {
            const rpcAccount: RpcAccount = {
                data: Uint8Array.from(account.data.raw),
                executable: account.executable,
                lamports: lamports(account.lamports),
                owner: fromWeb3JsPublicKey(account.owner),
                publicKey: fromWeb3JsPublicKey(account.pubkey),
            };

            return deserializeCollectionV1(rpcAccount);
        } else {
            return null;
        }
    } catch (e) {
        console.error('Problem parsing Core Collection...', e);
        return null;
    }
};
