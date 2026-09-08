// @vitest-environment node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EntityInspectorConfig } from '../../types.js';
import { createMcpRequestHandler } from '../handler.js';
import { createMcpServer } from '../server.js';

const TEST_CONFIG: EntityInspectorConfig = {
    rpcEndpoints: {
        devnet: 'https://devnet.rpc.address',
        'mainnet-beta': 'https://mainnet-beta.rpc.address',
        testnet: 'https://testnet.rpc.address',
    },
};

const MCP_HEADERS = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
};

function initializeRequest(id: number): Request {
    return mcpRequest(
        'initialize',
        {
            capabilities: {},
            clientInfo: { name: 'vitest-client', version: '0.1.0' },
            protocolVersion: LATEST_PROTOCOL_VERSION,
        },
        id,
    );
}

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

/**
 * Stateless transport: the client negotiates the protocol version via `initialize`, then sends it
 * as `mcp-protocol-version` with every tool request. MCP clients do this automatically once per
 * connection — the two-step flow below is only spelled out for sessionless clients like curl.
 *
 * @example Smoke test a deployment — initialize first (auth headers per `app/mcp/README.md`)
 * ```sh
 * curl -X POST https://<deployment>/mcp \
 *   -H 'Content-Type: application/json' \
 *   -H 'Accept: application/json, text/event-stream' \
 *   -H 'Authorization: Bearer <key>' \
 *   -H 'x-vercel-protection-bypass: <secret>' \
 *   -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0.0.0"}}}'
 * ```
 *
 * @example Then call a tool with the `protocolVersion` from the response — expect `pong`
 * ```sh
 * curl -X POST https://<deployment>/mcp \
 *   -H 'Content-Type: application/json' \
 *   -H 'Accept: application/json, text/event-stream' \
 *   -H 'Authorization: Bearer <key>' \
 *   -H 'x-vercel-protection-bypass: <secret>' \
 *   -H 'mcp-protocol-version: <negotiated-version>' \
 *   -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ping","arguments":{}}}'
 * ```
 */
async function negotiatedToolRequest(
    handler: ReturnType<typeof createMcpRequestHandler>,
    method: string,
    params: Record<string, unknown>,
    id: number,
): Promise<Request> {
    const initResponse = await handler(initializeRequest(0));
    const initPayload = await initResponse.json();
    return mcpRequest(method, params, id, {
        ...MCP_HEADERS,
        'mcp-protocol-version': initPayload.result.protocolVersion,
    });
}

describe('createMcpRequestHandler — real MCP SDK transport', () => {
    const handler = createMcpRequestHandler(TEST_CONFIG);

    it('should respond to initialize with the server identity', async () => {
        const response = await handler(initializeRequest(1));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            id: 1,
            jsonrpc: '2.0',
            result: { serverInfo: { name: 'explorer-mcp', version: '0.1.0' } },
        });
    });

    it('should list the inspect_entity and ping tools', async () => {
        const response = await handler(await negotiatedToolRequest(handler, 'tools/list', {}, 2));

        expect(response.status).toBe(200);
        const payload = await response.json();
        expect(payload.result.tools).toMatchObject([{ name: 'inspect_entity' }, { name: 'ping' }]);
    });

    it('should answer a ping tool call with pong', async () => {
        const response = await handler(
            await negotiatedToolRequest(handler, 'tools/call', { arguments: {}, name: 'ping' }, 3),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            id: 3,
            jsonrpc: '2.0',
            result: { content: [{ text: 'pong', type: 'text' }] },
        });
    });

    // '111' is valid base58 but 3 bytes — rejected before any RPC call, so the round-trip needs no network.
    it('should serve inspect_entity end to end for an invalid identifier', async () => {
        const response = await handler(
            await negotiatedToolRequest(
                handler,
                'tools/call',
                { arguments: { identifier: '111' }, name: 'inspect_entity' },
                4,
            ),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            id: 4,
            jsonrpc: '2.0',
            result: {
                isError: true,
                structuredContent: {
                    errors: [{ code: 'INVALID_ARGUMENT' }],
                    payload: {},
                },
            },
        });
    });

    it('should accept a config with a program name resolver and an instruction decode fallback', async () => {
        const handlerWithResolver = createMcpRequestHandler({
            ...TEST_CONFIG,
            decodeInstructionFallback: () => undefined,
            resolveProgramName: () => undefined,
        });
        const response = await handlerWithResolver(
            await negotiatedToolRequest(
                handlerWithResolver,
                'tools/call',
                { arguments: { identifier: '111' }, name: 'inspect_entity' },
                5,
            ),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            id: 5,
            result: { isError: true },
        });
    });
});

describe('createMcpRequestHandler — a deployment that enables one cluster', () => {
    const handler = createMcpRequestHandler({ ...TEST_CONFIG, enabledClusterNames: ['devnet'] });

    it('should advertise only the enabled cluster in the schema and the description', async () => {
        const response = await handler(await negotiatedToolRequest(handler, 'tools/list', {}, 30));

        const [inspectEntity] = (await response.json()).result.tools;
        expect(inspectEntity.inputSchema.properties.cluster).toMatchObject({ default: 'devnet', enum: ['devnet'] });
        expect(inspectEntity.description).toContain('CLUSTER: Solana network to query (devnet). Defaults to devnet.');
    });

    it('should reject a call naming a cluster the deployment withheld', async () => {
        const response = await handler(
            await negotiatedToolRequest(
                handler,
                'tools/call',
                { arguments: { cluster: 'mainnet-beta', identifier: '111' }, name: 'inspect_entity' },
                31,
            ),
        );

        await expect(response.json()).resolves.toMatchObject({ id: 31, result: { isError: true } });
    });

    it('should refuse to start when an enabled cluster has no RPC endpoint', () => {
        expect(() =>
            createMcpRequestHandler({
                ...TEST_CONFIG,
                enabledClusterNames: ['devnet'],
                rpcEndpoints: { ...TEST_CONFIG.rpcEndpoints, devnet: '' },
            }),
        ).toThrow(/devnet/);
    });

    it('should refuse to start on an unparseable endpoint without echoing it', () => {
        const create = () =>
            createMcpRequestHandler({
                ...TEST_CONFIG,
                enabledClusterNames: ['devnet'],
                // Scheme-less: undici reports this one as `Failed to parse URL from <url>`, api key included.
                rpcEndpoints: { ...TEST_CONFIG.rpcEndpoints, devnet: 'devnet.rpc.address/?api-key=SUPERSECRET' },
            });

        expect(create).toThrow(/devnet/);
        expect(create).not.toThrow(/SUPERSECRET/);
    });
});

// The initialized NOTIFICATION (not the initialize request) is what fires `oninitialized` — real
// MCP clients send it right after negotiation; the sessionless harness must do so explicitly.
function initializedNotification(): Request {
    return new Request('http://localhost/mcp', {
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
        headers: MCP_HEADERS,
        method: 'POST',
    });
}

describe('createMcpRequestHandler — analytics and server wrapping', () => {
    it('should emit mcp_initialize and a ping mcp_tool_call through the injected track', async () => {
        const track = vi.fn();
        const handler = createMcpRequestHandler({ ...TEST_CONFIG, track });

        await handler(initializedNotification());
        const response = await handler(
            await negotiatedToolRequest(handler, 'tools/call', { arguments: {}, name: 'ping' }, 10),
        );

        expect(response.status).toBe(200);
        expect(track).toHaveBeenCalledWith({ name: 'mcp_initialize', params: {} });
        expect(track).toHaveBeenCalledWith({
            name: 'mcp_tool_call',
            params: {
                duration_ms: expect.any(Number),
                status: 'success',
                tool: 'ping',
            },
        });
    });

    it('should emit an errored inspect_entity mcp_tool_call with the defaulted cluster and error code', async () => {
        const track = vi.fn();
        const handler = createMcpRequestHandler({ ...TEST_CONFIG, track });

        const response = await handler(
            await negotiatedToolRequest(
                handler,
                'tools/call',
                { arguments: { identifier: '111' }, name: 'inspect_entity' },
                11,
            ),
        );

        expect(response.status).toBe(200);
        expect(track).toHaveBeenCalledWith({
            name: 'mcp_tool_call',
            params: {
                cluster: 'mainnet-beta',
                duration_ms: expect.any(Number),
                error_code: 'INVALID_ARGUMENT',
                status: 'error',
                tool: 'inspect_entity',
            },
        });
    });

    it('should warn and still answer when the track sink throws', async () => {
        const track = vi.fn().mockImplementation(() => {
            throw new Error('sink boom');
        });
        const warn = vi.fn();
        const handler = createMcpRequestHandler({
            ...TEST_CONFIG,
            logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn },
            track,
        });

        await handler(initializedNotification());
        const response = await handler(
            await negotiatedToolRequest(handler, 'tools/call', { arguments: {}, name: 'ping' }, 12),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            result: { content: [{ text: 'pong', type: 'text' }] },
        });
        expect(warn).toHaveBeenCalledWith('[entity-inspector] analytics track failed', {
            error: expect.objectContaining({ name: 'Error' }),
            tool: 'initialize',
        });
        expect(warn).toHaveBeenCalledWith('[entity-inspector] analytics track failed', {
            error: expect.objectContaining({ name: 'Error' }),
            tool: 'ping',
        });
    });

    it('should measure the tool call duration around the handler', async () => {
        // Only Date is faked — the SDK transport keeps its real timers.
        vi.useFakeTimers({ toFake: ['Date'] });
        try {
            const track = vi.fn();
            const server = createMcpServer({
                fetchAccountInfo: vi.fn().mockImplementation(async () => {
                    vi.setSystemTime(Date.now() + 1234);
                    return { value: null };
                }),
                fetchAsset: vi.fn().mockResolvedValue(null),
                fetchSignatureStatus: vi.fn(),
                fetchTransaction: vi.fn(),
                logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
                track,
            });
            // Stateless transport is single-request: one fresh pair, no live negotiation needed.
            const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
            await server.connect(transport);
            await transport.handleRequest(
                mcpRequest(
                    'tools/call',
                    {
                        arguments: { identifier: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T' },
                        name: 'inspect_entity',
                    },
                    20,
                    { ...MCP_HEADERS, 'mcp-protocol-version': LATEST_PROTOCOL_VERSION },
                ),
            );

            expect(track).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'mcp_tool_call',
                    params: expect.objectContaining({ duration_ms: 1234 }),
                }),
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it('should fall back to the console logger when a bare server has a throwing track sink', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const server = createMcpServer({
            fetchAccountInfo: vi.fn(),
            fetchAsset: vi.fn(),
            fetchSignatureStatus: vi.fn(),
            fetchTransaction: vi.fn(),
            track: () => {
                throw new Error('sink boom');
            },
        });

        server.server.oninitialized?.();

        expect(warnSpy).toHaveBeenCalledWith('[entity-inspector] analytics track failed', {
            error: expect.objectContaining({ name: 'Error' }),
            tool: 'initialize',
        });
        warnSpy.mockRestore();
    });

    it('should serve every request from the server the wrapper returns', async () => {
        // A distinct wrapped instance: its identity in the reply proves the return value is used, not just called.
        const wrapServer = vi.fn(() => new McpServer({ name: 'wrapped-server', version: '9.9.9' }));
        const handler = createMcpRequestHandler({ ...TEST_CONFIG, wrapServer });

        const response = await handler(initializeRequest(13));

        expect(response.status).toBe(200);
        expect(wrapServer).toHaveBeenCalledTimes(1);
        expect(wrapServer).toHaveBeenCalledWith(expect.any(McpServer));
        await expect(response.json()).resolves.toMatchObject({
            result: { serverInfo: { name: 'wrapped-server', version: '9.9.9' } },
        });
    });
});

// Spy (not vi.mock) so these close-failure cases can share a file with the round-trips above.
describe('createMcpRequestHandler — real MCP SDK transport, close failures', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should log both close failures via the injected logger and still return the response', async () => {
        vi.spyOn(WebStandardStreamableHTTPServerTransport.prototype, 'close').mockRejectedValue(
            new Error('transport boom'),
        );
        vi.spyOn(McpServer.prototype, 'close').mockRejectedValue(new Error('server boom'));
        const warn = vi.fn();
        const handler = createMcpRequestHandler({
            logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn },
            rpcEndpoints: TEST_CONFIG.rpcEndpoints,
        });

        const response = await handler(initializeRequest(1));

        expect(response.status).toBe(200);
        expect(warn).toHaveBeenCalledWith('[entity-inspector] transport close failed', {
            error: expect.objectContaining({ name: 'Error' }),
        });
        expect(warn).toHaveBeenCalledWith('[entity-inspector] server close failed', {
            error: expect.objectContaining({ name: 'Error' }),
        });
    });
});
