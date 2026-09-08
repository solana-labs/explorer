// Fails the build if this module (which reads key-bearing RPC env) is ever imported into a client bundle.
import 'server-only';

import type { EntityInspectorConfig, McpRequestHandler } from '@explorer/entity-inspector';
import { isParsedInstruction } from '@explorer/parsers';
import { getBase58Encoder } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

import { MCP_ENABLED_CLUSTER_NAMES } from '@/app/shared/config/mcp-clusters';
import { Logger } from '@/app/shared/lib/logger';
import { wrapMcpServerWithSentry } from '@/app/shared/lib/sentry';
import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';
import { Cluster, serverClusterUrl } from '@/app/utils/cluster';
import { programNameByAddress } from '@/app/utils/programs';

import { createMcpTrack } from './telemetry';

const resolveProgramName: EntityInspectorConfig['resolveProgramName'] = programNameByAddress;

const decodeInstructionFallback: EntityInspectorConfig['decodeInstructionFallback'] = instruction => {
    const dispatched = instructionParserDispatcher.fromTransactionInstruction(
        new TransactionInstruction({
            data: Buffer.from(getBase58Encoder().encode(instruction.data)),
            keys: instruction.accounts.map(account => ({
                isSigner: account.signer,
                isWritable: account.writable,
                pubkey: new PublicKey(account.address),
            })),
            programId: new PublicKey(instruction.programId),
        }),
    );
    if (!isParsedInstruction(dispatched)) {
        return undefined;
    }
    // Parser info carries PublicKey/BN/bigint values; the wire format needs their JSON forms
    // (JSON.stringify throws on bigint — kit-based parsers like lighthouse decode u64s as bigint).
    return {
        info: JSON.parse(JSON.stringify(dispatched.parsed.info, bigIntReplacer)),
        program: dispatched.program,
        type: dispatched.parsed.type,
    };
};

function bigIntReplacer(_key: string, value: unknown): unknown {
    if (typeof value === 'bigint') {
        return value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER ? Number(value) : String(value);
    }
    return value;
}

const logger: EntityInspectorConfig['logger'] = {
    debug: (message, context) => Logger.debug(message, context),
    // Wrap in Error: Logger.error replaces a bare string with a sentinel, losing the message in Sentry.
    error: (message, context) => Logger.error(new Error(message), context),
    info: (message, context) => Logger.info(message, context),
    warn: (message, context) => Logger.warn(message, context),
};

// Resolved at handler init (cold start), not module scope, so key-bearing URLs come from runtime env, never a build artifact.
// Unset falls back to the app's own server RPC config (`serverClusterUrl` → `*_RPC_URL` env), which is the proxied
// default for every cluster. Every supported cluster gets an entry whether or not it is enabled.
function resolveRpcEndpoints(): EntityInspectorConfig['rpcEndpoints'] {
    return {
        devnet: process.env.MCP_SOLANA_RPC_URL_DEVNET || serverClusterUrl(Cluster.Devnet),
        'mainnet-beta': process.env.MCP_SOLANA_RPC_URL_MAINNET_BETA || serverClusterUrl(Cluster.MainnetBeta),
        testnet: process.env.MCP_SOLANA_RPC_URL_TESTNET || serverClusterUrl(Cluster.Testnet),
    };
}

let handlerPromise: Promise<McpRequestHandler> | undefined;

/** Lazy so a disabled endpoint never loads the MCP package. */
export function getMcpRequestHandler(): Promise<McpRequestHandler> {
    if (!handlerPromise) {
        handlerPromise = importRequestHandler().catch(error => {
            // Clear the cache on failure so a transient import error isn't stuck until redeploy.
            handlerPromise = undefined;
            throw error;
        });
    }
    return handlerPromise;
}

async function importRequestHandler(): Promise<McpRequestHandler> {
    const { createMcpRequestHandler } = await import('@explorer/entity-inspector');
    return createMcpRequestHandler({
        decodeInstructionFallback,
        enabledClusterNames: MCP_ENABLED_CLUSTER_NAMES,
        logger,
        resolveProgramName,
        rpcEndpoints: resolveRpcEndpoints(),
        track: createMcpTrack(),
        // Sentry auto-instruments tool calls with spans + error capture (dev-facing observability).
        wrapServer: wrapMcpServerWithSentry,
    });
}
