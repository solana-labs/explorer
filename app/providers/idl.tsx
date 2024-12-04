import { AnchorProvider, Idl, Program } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import pako from 'pako';
import { useMemo } from 'react';

import { formatIdl } from '../utils/convertLegacyIdl';

const cachedIdlPromises: Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: Idl | null }
> = {};

async function fetchIdlFromMetadataProgram(programAddress: string, connection: Connection): Promise<Idl | null> {
    const [idlAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('idl', 'utf8'), new PublicKey(programAddress).toBuffer()],
        new PublicKey('pmetaypqG6SiB47xMigYVMAkuHDWeSDXcv3zzDrJJvA')
    );

    const accountInfo = await connection.getAccountInfo(idlAccount);
    if (!accountInfo) {
        console.error('IDL account not found!');
        return null;
    }

    // Extract data length and compressed data
    const dataLenBytes = accountInfo.data.slice(40, 44); // `data_len` starts at offset 40
    const dataLength = new DataView(dataLenBytes.buffer).getUint32(0, true); // Little-endian
    const compressedData = accountInfo.data.slice(44, 44 + dataLength); // Skip metadata (44 bytes)

    // Decompress and parse the data
    try {
        const decompressedString = new TextDecoder('utf-8').decode(pako.inflate(compressedData));
        // First try parsing as IDL directly
        try {
            const idl = JSON.parse(decompressedString);
            return idl;
        } catch (parseErr) {
            console.log('Not a direct IDL object, checking if URL...');
        }

        // If not an IDL, try handling as URL
        try {
            const url = new URL(decompressedString.trim());
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch IDL from URL: ${response.statusText}`);
            }
            const fetchedIdl = await response.json();
            return fetchedIdl;
        } catch (urlErr) {
            console.error('Not a valid IDL URL:', urlErr);
        }

        console.error('Could not parse IDL from decompressed data');
        return null;
    } catch (err) {
        console.error('Failed to decompress or process data:', err);
        return null;
    }
}

function useIdlFromMetadataProgram(programAddress: string, url: string): Idl | null {
    const key = `${programAddress}-${url}`;
    const cacheEntry = cachedIdlPromises[key];

    // If there's no cached entry, start fetching the IDL
    if (cacheEntry === undefined) {
        const connection = new Connection(url);
        const promise = fetchIdlFromMetadataProgram(programAddress, connection)
            .then(idl => {
                cachedIdlPromises[key] = {
                    __type: 'result',
                    result: idl,
                };
            })
            .catch(err => {
                console.error('Error fetching IDL:', err);
                cachedIdlPromises[key] = { __type: 'result', result: null };
            });
        cachedIdlPromises[key] = {
            __type: 'promise',
            promise,
        };
        throw promise; // Throw the promise for React Suspense
    }

    // If the cache has a pending promise, throw it
    if (cacheEntry.__type === 'promise') {
        throw cacheEntry.promise;
    }

    // Return the cached result
    return cacheEntry.result;
}

function getProvider(url: string) {
    return new AnchorProvider(new Connection(url), new NodeWallet(Keypair.generate()), {});
}

export function useIdlFromProgramMetadataProgram(
    programAddress: string,
    url: string
): { program: Program | null; idl: Idl | null } {
    const idlFromProgramMetadataProgram = useIdlFromMetadataProgram(programAddress, url);
    const idl = idlFromProgramMetadataProgram;
    const program: Program<Idl> | null = useMemo(() => {
        if (!idl) return null;
        try {
            const program = new Program(formatIdl(idl, programAddress), getProvider(url));
            return program;
        } catch (e) {
            console.error('Error creating anchor program for', programAddress, e, { idl });
            return null;
        }
    }, [idl, programAddress, url]);
    return { idl, program };
}

export type AnchorAccount = {
    layout: string;
    account: object;
};
