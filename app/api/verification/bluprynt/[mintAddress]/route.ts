import { type Address, address, createSolanaRpc } from '@solana/kit';
import { Cluster, serverClusterUrl } from '@utils/cluster';
import { NextResponse } from 'next/server';
import { findAttestationPda, findSchemaPda } from 'sas-lib';

import { CACHE_HEADERS, ERROR_CACHE_HEADERS, isTimeoutError } from '@/app/shared/lib/http-utils';
import { Logger } from '@/app/shared/lib/logger';

import { BLUPRYNT_CONFIG } from '../config';

const RPC_TIMEOUT_MS = 15_000;
// SAS protocol supports up to 256 schema versions. We decided to use 32 for now.
const MAX_SCHEMA_VERSIONS = 32;

const rpc = createSolanaRpc(serverClusterUrl(Cluster.MainnetBeta));

async function getSchemaVersionPdas(credentialAddress: Address, schemaName: string): Promise<Address[]> {
    const versions = await Promise.all(
        Array.from({ length: MAX_SCHEMA_VERSIONS }, (_, version) =>
            findSchemaPda({
                credential: credentialAddress,
                name: schemaName,
                version,
            }),
        ),
    );
    return versions.map(([addr]) => addr);
}

type Params = {
    params: Promise<{
        mintAddress: string;
    }>;
};

export async function GET(_request: Request, props: Params) {
    const { mintAddress } = await props.params;

    let mintAddr: Address;
    try {
        mintAddr = address(mintAddress);
    } catch {
        return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
    }

    try {
        const credentialAddr = address(BLUPRYNT_CONFIG.credentialAuthority);

        const schemaPdas = await getSchemaVersionPdas(credentialAddr, BLUPRYNT_CONFIG.schemaName);

        const attestationPdas = await Promise.all(
            schemaPdas.map(schema =>
                findAttestationPda({
                    credential: credentialAddr,
                    nonce: mintAddr,
                    schema,
                }),
            ),
        );

        const { value: accountInfos } = await rpc
            .getMultipleAccounts(
                attestationPdas.map(([addr]) => addr),
                { commitment: 'confirmed', encoding: 'base64' },
            )
            .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });
        const verified = accountInfos.some(info => info !== null);

        return NextResponse.json({ verified }, { headers: CACHE_HEADERS });
    } catch (error) {
        if (isTimeoutError(error)) {
            Logger.warn('[api:bluprynt] RPC request timed out', { mintAddress, sentry: true });
            return NextResponse.json(
                { error: 'Verification request timed out' },
                { headers: ERROR_CACHE_HEADERS, status: 504 },
            );
        }

        Logger.panic(error instanceof Error ? error : new Error('Failed to verify bluprynt data'));
        return NextResponse.json(
            { error: 'Failed to verify bluprynt data' },
            { headers: ERROR_CACHE_HEADERS, status: 500 },
        );
    }
}
