import { NodeWallet } from '@metaplex/js';
import { Idl, Program, Provider } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as elfy from 'elfy';
import pako from 'pako';
import { useEffect, useMemo } from 'react';

import { useAccountInfo, useFetchAccountInfo } from './accounts';
import { useCluster } from './cluster';

const cachedAnchorProgramPromises: Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: Program<Idl> | null }
> = {};

function useProgramElf(programAddress: string) {
    const { url } = useCluster();
    const fetchAccountInfo = useFetchAccountInfo();
    const programInfo = useAccountInfo(programAddress);
    const programDataAddress: string | undefined = programInfo?.data?.data.parsed?.parsed.info['programData'];
    const programDataInfo = useAccountInfo(programDataAddress);

    useEffect(() => {
        if (!programInfo) {
            fetchAccountInfo(new PublicKey(programAddress), 'parsed');
        }
    }, [programAddress, fetchAccountInfo, programInfo]);

    useEffect(() => {
        if (programDataAddress && !programDataInfo) {
            fetchAccountInfo(new PublicKey(programDataAddress), 'raw');
        }
    }, [programDataAddress, fetchAccountInfo, programDataInfo]);

    const param = useMemo(() => {
        if (programDataInfo && programDataInfo.data && programDataInfo.data.data.raw) {
            const offset =
                (programInfo?.data?.owner.toString() ?? '') === 'BPFLoaderUpgradeab1e11111111111111111111111' ? 45 : 0;
            const raw = Buffer.from(programDataInfo.data.data.raw.slice(offset));

            try {
                const idl = parseIdlFromElf(raw);
                return new Program(idl, programAddress, getProvider(url));
            } catch (_e) {
                return null;
            }
        }
        return null;
    }, [programDataInfo, programInfo, programAddress, url]);
    return param;
}

function parseIdlFromElf(elfBuffer: any) {
    const elf = elfy.parse(elfBuffer);
    const solanaIdlSection = elf.body.sections.find((section: any) => section.name === '.solana.idl');
    if (!solanaIdlSection) {
        throw new Error('.solana.idl section not found');
    }

    // Extract the section data
    const solanaIdlData = solanaIdlSection.data;

    // Parse the section data
    solanaIdlData.readUInt32LE(4);
    const ptr = solanaIdlData.readUInt32LE(4);
    const size = solanaIdlData.readBigUInt64LE(8);

    // Get the compressed bytes
    const byteRange = elfBuffer.slice(ptr, ptr + Number(size));

    // Decompress the IDL
    try {
        const inflatedIdl = JSON.parse(new TextDecoder().decode(pako.inflate(byteRange)));
        return inflatedIdl;
    } catch (err) {
        console.error('Failed to decompress data:', err);
        return null;
    }
}

function getProvider(url: string) {
    return new Provider(new Connection(url), new NodeWallet(Keypair.generate()), {});
}

function useAnchorIdlAccount(programAddress: string, url: string): Program | null {
    const key = `${programAddress}-${url}`;
    const cacheEntry = cachedAnchorProgramPromises[key];

    if (cacheEntry === undefined) {
        const promise = Program.at(programAddress, getProvider(url))
            .then(program => {
                cachedAnchorProgramPromises[key] = {
                    __type: 'result',
                    result: program,
                };
            })
            .catch(_ => {
                cachedAnchorProgramPromises[key] = { __type: 'result', result: null };
            });
        cachedAnchorProgramPromises[key] = {
            __type: 'promise',
            promise,
        };
        throw promise;
    } else if (cacheEntry.__type === 'promise') {
        throw cacheEntry.promise;
    }
    return cacheEntry.result;
}

export function useAnchorProgram(programAddress: string, url: string): Program | null {
    const idlFromBinary = useProgramElf(programAddress);
    const idlFromAccount = useAnchorIdlAccount(programAddress, url);
    return idlFromBinary ?? idlFromAccount;
}

export type AnchorAccount = {
    layout: string;
    account: object;
};
