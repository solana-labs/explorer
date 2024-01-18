import {  Connection } from '@solana/web3.js';
import {  getDomainKey, getNameOwner } from '@onsol/tldparser';

export const hasANSDomainSyntax = (value: string) => {
    return value.length > 4 && value.split('.').length === 2;
};

// returns owner address and name account address.
export async function getANSDomainOwnerAndAddress(domainTld: string, connection: Connection) {
    const derivedDomainKey = await getDomainKey(domainTld.toLowerCase());
    try {
        // returns only non expired domains,
        const owner = await getNameOwner(connection, derivedDomainKey.pubkey);
        return owner
            ? {
                owner: owner.toString(),
                address: derivedDomainKey.pubkey.toString(),
            }
            : null;
    } catch {
        return null;
    }
}
