import { Connection, PublicKey } from '@solana/web3.js';
import { fetchProgramMetadata, ProgramMetaData } from 'solana-program-metadata';

const cachedLogoProgramPromises: Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: ProgramMetaData | null }
> = {};

async function fetchProgramMetaData(programAddress: string, connection: Connection): Promise<ProgramMetaData | null> {
    try {
        const programMetadata = await fetchProgramMetadata(new PublicKey(programAddress), connection.rpcEndpoint);
        return programMetadata;
    } catch (err) {
        console.error('Failed to decompress or process metadata:', err);
        return null;
    }
}

function useProgramMetaData(programAddress: string, url: string): ProgramMetaData | null {
    const key = `${programAddress}-${url}-logo`;
    const cacheEntry = cachedLogoProgramPromises[key];

    // If there's no cached entry, start fetching the program metadata
    if (cacheEntry === undefined) {
        const connection = new Connection(url);
        const promise = fetchProgramMetaData(programAddress, connection)
            .then(programMetadata => {
                cachedLogoProgramPromises[key] = {
                    __type: 'result',
                    result: programMetadata,
                };
            })
            .catch(err => {
                console.error('Error fetching Program Metadata:', err);
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
