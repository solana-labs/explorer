import { Base58EncodedAddress } from 'web3js-experimental';

const LOOKUP_TABLE_ACCOUNT_TYPE = 1;
const PROGRAM_ID =
    'AddressLookupTab1e1111111111111111111111111' as Base58EncodedAddress<'AddressLookupTab1e1111111111111111111111111'>;

export function isAddressLookupTableAccount(accountOwner: Base58EncodedAddress, accountData: Uint8Array): boolean {
    if (accountOwner !== PROGRAM_ID) return false;
    if (!accountData || accountData.length === 0) return false;
    return accountData[0] === LOOKUP_TABLE_ACCOUNT_TYPE;
}
