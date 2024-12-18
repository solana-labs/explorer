import { AnchorProvider, Idl, Program } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import { fetchIDL } from 'solana-program-metadata';

import { formatIdl } from '../utils/convertLegacyIdl';

const cachedIdlPromises: Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: Idl | null }
> = {};

async function fetchIdlFromMetadataProgram(programAddress: string, connection: Connection): Promise<Idl | null> {
    const result = await fetchIDL(new PublicKey(programAddress), connection.rpcEndpoint);

    if (!result) {
        console.error('IDL not found!');
        return null;
    }

    const idl = JSON.parse(result);
    return idl;
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
