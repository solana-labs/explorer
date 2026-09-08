import { getBase58Encoder } from '@solana/kit';
import { PUBLIC_KEY_LENGTH } from '@solana/web3.js';
import { Cluster, clusterFromSlug, clusterSlug, type ServerCluster } from '@utils/cluster';
import { NextResponse } from 'next/server';

import { GENESIS_HASHES } from '@/app/entities/chain-id/server';
import { resolveSearchTokens, SEARCH_CACHE_HEADERS } from '@/app/features/search/server';
import { NO_STORE_HEADERS } from '@/app/shared/lib/http-utils';

const BASE58_ENCODER = getBase58Encoder();

const SEARCH_QUERY_MAX_LENGTH = 200;

function clusterFromGenesisHash(genesisHash: string): ServerCluster | null {
    switch (genesisHash) {
        case GENESIS_HASHES.MAINNET:
            return Cluster.MainnetBeta;
        case GENESIS_HASHES.TESTNET:
            return Cluster.Testnet;
        case GENESIS_HASHES.DEVNET:
            return Cluster.Devnet;
        default:
            return null;
    }
}

function detectQueryType(query: string): 'address' | 'text' {
    try {
        const decoded = BASE58_ENCODER.encode(query);
        return decoded.length === PUBLIC_KEY_LENGTH ? 'address' : 'text';
    } catch {
        return 'text';
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? searchParams.get('query') ?? '';
    const clusterParam = searchParams.get('cluster');

    const trimmed = query.trim();

    if (!trimmed || trimmed.length > SEARCH_QUERY_MAX_LENGTH) {
        return NextResponse.json(
            { meta: { total: 0 }, query: trimmed, queryType: 'text', results: { tokens: [] }, success: true },
            { headers: SEARCH_CACHE_HEADERS },
        );
    }

    const cluster = clusterFromSlug(clusterParam || clusterSlug(Cluster.MainnetBeta));

    if (cluster === undefined) {
        return NextResponse.json(
            { error: 'Invalid cluster', success: false },
            { headers: NO_STORE_HEADERS, status: 400 },
        );
    }

    const filterUnverified = Boolean(process.env.NEXT_PUBLIC_SEARCH_DISABLE_UNVERIFIED_TOKENS);

    if (cluster === Cluster.Custom) {
        const genesisHash = searchParams.get('genesisHash');
        const resolvedCluster = genesisHash ? clusterFromGenesisHash(genesisHash) : null;

        if (resolvedCluster === null) {
            return NextResponse.json(
                {
                    meta: { total: 0 },
                    query: trimmed,
                    queryType: detectQueryType(trimmed),
                    results: { tokens: [] },
                    success: true,
                },
                { headers: NO_STORE_HEADERS },
            );
        }

        const queryType = detectQueryType(trimmed);
        const tokens = await resolveSearchTokens(trimmed, resolvedCluster, { filterUnverified });
        return NextResponse.json(
            { meta: { total: tokens.length }, query: trimmed, queryType, results: { tokens }, success: true },
            { headers: SEARCH_CACHE_HEADERS },
        );
    }

    const queryType = detectQueryType(trimmed);
    const tokens = await resolveSearchTokens(trimmed, cluster, { filterUnverified });

    return NextResponse.json(
        { meta: { total: tokens.length }, query: trimmed, queryType, results: { tokens }, success: true },
        { headers: SEARCH_CACHE_HEADERS },
    );
}
