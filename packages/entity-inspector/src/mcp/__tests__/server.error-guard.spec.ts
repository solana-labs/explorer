// @vitest-environment node
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';

import type { EntityInspectorConfig } from '../../types.js';
import { createMcpRequestHandler } from '../handler.js';

// A raw RPC failure carries the key-bearing endpoint; the SDK would return its `message` to the client verbatim.
const ENDPOINT_WITH_KEY = 'https://mainnet-beta.rpc.address/?api-key=SUPERSECRET';

const { handleInspectEntity } = vi.hoisted(() => ({ handleInspectEntity: vi.fn() }));

vi.mock('../tools/inspect-entity.js', () => ({ handleInspectEntity }));

const TEST_CONFIG: EntityInspectorConfig = {
    logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    rpcEndpoints: {
        devnet: 'https://devnet.rpc.address',
        'mainnet-beta': ENDPOINT_WITH_KEY,
        testnet: 'https://testnet.rpc.address',
    },
};

const MCP_HEADERS = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
};

function mcpRequest(
    method: string,
    params: Record<string, unknown>,
    id: number,
    headers: Record<string, string> = MCP_HEADERS,
): Request {
    return new Request('http://localhost/mcp', {
        body: JSON.stringify({ id, jsonrpc: '2.0', method, params }),
        headers,
        method: 'POST',
    });
}

async function callInspectEntity(handler: ReturnType<typeof createMcpRequestHandler>) {
    const initResponse = await handler(
        mcpRequest(
            'initialize',
            {
                capabilities: {},
                clientInfo: { name: 'vitest-client', version: '0.1.0' },
                protocolVersion: LATEST_PROTOCOL_VERSION,
            },
            0,
        ),
    );
    const initPayload = await initResponse.json();
    const response = await handler(
        mcpRequest('tools/call', { arguments: { identifier: '111' }, name: 'inspect_entity' }, 1, {
            ...MCP_HEADERS,
            'mcp-protocol-version': initPayload.result.protocolVersion,
        }),
    );
    return response.json();
}

describe('createMcpServer — tool error guard', () => {
    it('should return the fixed internal-error message when the tool handler throws', async () => {
        handleInspectEntity.mockRejectedValue(new Error(`Failed to parse URL from ${ENDPOINT_WITH_KEY}`));

        const payload = await callInspectEntity(createMcpRequestHandler(TEST_CONFIG));

        expect(payload.result).toMatchObject({
            isError: true,
            structuredContent: {
                errors: [{ code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }],
                payload: {},
            },
        });
    });

    it('should keep the rpc endpoint out of the response when the tool handler throws', async () => {
        handleInspectEntity.mockRejectedValue(new Error(`Failed to parse URL from ${ENDPOINT_WITH_KEY}`));

        const payload = await callInspectEntity(createMcpRequestHandler(TEST_CONFIG));

        expect(JSON.stringify(payload)).not.toContain('SUPERSECRET');
        expect(JSON.stringify(payload)).not.toContain('rpc.address');
    });
});
