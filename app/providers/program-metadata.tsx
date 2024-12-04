import { Connection, PublicKey } from '@solana/web3.js';
import pako from 'pako';

const cachedLogoProgramPromises: Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: ProgramMetaData | null }
> = {};

interface ProgramMetaData {
    name: string;
    logo?: string;
    description?: string;
    notification?: string;
    sdk?: string;
    version?: string;
    project_url?: string;
    contacts?: string[];
    policy?: string;
    preferred_languages?: string[];
    encryption?: string;
    source_code?: string;
    source_release?: string;
    source_revision?: string;
    auditors?: string[] | string;
    acknowledgements?: string;
    expiry?: string;
}

async function fetchProgramMetaData(programAddress: string, connection: Connection): Promise<ProgramMetaData | null> {
    const [idlAccount] = await PublicKey.findProgramAddress(
        [Buffer.from('metadata', 'utf8'), new PublicKey(programAddress).toBuffer()],
        new PublicKey('pmetaypqG6SiB47xMigYVMAkuHDWeSDXcv3zzDrJJvA')
    );
    console.log(`IDl account ${programAddress} idlAccount: ${idlAccount.toBase58()}`);

    const accountInfo = await connection.getAccountInfo(idlAccount);
    if (!accountInfo) {
        console.error('IDL account not found!');
        return null;
    }

    // Extract data length and compressed data
    const dataLenBytes = accountInfo.data.slice(40, 44); // `data_len` starts at offset 40
    const dataLength = new DataView(dataLenBytes.buffer).getUint32(0, true); // Little-endian
    const compressedData = accountInfo.data.slice(44, 44 + dataLength); // Skip metadata (44 bytes)

    // Decompress and parse the metadata
    try {
        const decompressedString = new TextDecoder('utf-8').decode(pako.inflate(compressedData));

        // First try parsing as metadata object directly
        try {
            const metadata = JSON.parse(decompressedString) as ProgramMetaData;
            if (metadata.name) { // Basic validation that it's a metadata object
                return metadata;
            }
        } catch (parseErr) {
            console.log('Not a direct metadata object, checking if URL...');
        }

        // Then try handling as URL
        try {
            const url = new URL(decompressedString.trim());
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch metadata from URL: ${response.statusText}`);
            }
            const fetchedMetadata = await response.json();
            if (fetchedMetadata.name) { // Basic validation
                return fetchedMetadata;
            }
            throw new Error('Fetched data is not a valid metadata object');
        } catch (urlErr) {
            console.log('Not a valid metadata URL');
        }

        // If we get here, neither approach worked
        console.error('Could not parse metadata from decompressed data');
        return null;

    } catch (err) {
        console.error('Failed to decompress or process metadata:', err);
        return null;
    }
}

function useProgramMetaData(programAddress: string, url: string): ProgramMetaData | null {
    const key = `${programAddress}-${url}-logo`;
    const cacheEntry = cachedLogoProgramPromises[key];

    // If there's no cached entry, start fetching the IDL
    if (cacheEntry === undefined) {
        const connection = new Connection(url);
        const promise = fetchProgramMetaData(programAddress, connection)
            .then(idl => {
                cachedLogoProgramPromises[key] = {
                    __type: 'result',
                    result: idl,
                };
            })
            .catch(err => {
                console.error('Error fetching IDL:', err);
                cachedLogoProgramPromises[key] = { __type: 'result', result: null };
            });
        cachedLogoProgramPromises[key] = {
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

export function useProgramMetadata(programAddress: string, url: string): ProgramMetaData | null {
    const programMetaData = useProgramMetaData(programAddress, url);
    return programMetaData;
}

export type AnchorAccount = {
    layout: string;
    account: object;
};
