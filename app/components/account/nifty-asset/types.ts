import { ASSET_PROGRAM_ID, Discriminator } from '@nifty-oss/asset';
import { PublicKey } from '@solana/web3.js';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

export const KNOWN_IMAGE_EXTENSIONS = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];

export function isNiftyAssetAccount(accountOwner: PublicKey, accountData?: Uint8Array): boolean {
    if (fromWeb3JsPublicKey(accountOwner) !== ASSET_PROGRAM_ID) return false;
    if (!accountData || accountData.length === 0) return false;
    return accountData[0] === Discriminator.Asset;
}
