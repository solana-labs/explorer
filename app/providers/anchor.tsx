import { AnchorProvider, Idl, Program } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as elfy from 'elfy';
import pako from 'pako';
import { useEffect, useMemo } from 'react';

import { formatIdl } from '../utils/convertLegacyIdl';
import { useAccountInfo, useFetchAccountInfo } from './accounts';

const cachedAnchorProgramPromises: Record<
    string,
    void | { __type: 'promise'; promise: Promise<void> } | { __type: 'result'; result: Idl | null }
> = {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useIdlFromSolanaProgramBinary(programAddress: string): Idl | null {
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
                return parseIdlFromElf(raw);
            } catch (e) {
                return null;
            }
        }
        return null;
    }, [programDataInfo, programInfo]);
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
    return new AnchorProvider(new Connection(url), new NodeWallet(Keypair.generate()), {});
}

function useIdlFromAnchorProgramSeed(programAddress: string, url: string): Idl | null {
    const key = `${programAddress}-${url}`;
    const cacheEntry = cachedAnchorProgramPromises[key];

    if (cacheEntry === undefined) {
        const programId = new PublicKey(programAddress);
        const promise = Program.fetchIdl<Idl>(programId, getProvider(url))
            .then(idl => {
                if (!idl) {
                    throw new Error(`IDL not found for program: ${programAddress.toString()}`);
                }

                cachedAnchorProgramPromises[key] = {
                    __type: 'result',
                    result: idl,
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

export function useAnchorProgram(programAddress: string, url: string): { program: Program | null; idl: Idl | null } {
    // TODO(ngundotra): Rewrite this to be more efficient
    // const idlFromBinary = useIdlFromSolanaProgramBinary(programAddress);
    const idlFromAnchorProgram = useIdlFromAnchorProgramSeed(programAddress, url);
    const idl = idlFromAnchorProgram;
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
