/**
 * Per-client setup instructions for the overview page. Snippets are functions
 * of the deployment origin so the visitor copies a config that already points
 * at the Explorer instance they are on.
 *
 * `isRestricted` reflects a deployment that gates `/mcp` with `MCP_ACCESS_KEYS`
 * (the live probe saw a 401/403). In that state the open, key-less config is
 * rejected, so each snippet switches to its authorized form — a `--header`
 * flag for the CLIs, a `headers` block for the config-file clients — with an
 * `<access-key>` placeholder the visitor replaces with the key the deployment
 * was configured with.
 */
export type SetupClient = {
    id: string;
    label: string;
    /** Where the snippet goes (command line, config file path, UI path). */
    where: string;
    /** Overrides `where` when the endpoint is gated (some flows can't carry a header via their UI). */
    restrictedWhere?: string;
    snippet: (origin: string, isRestricted: boolean) => string;
    verify: string;
};

// Placeholder the visitor swaps for the real bearer key on a gated deployment.
const ACCESS_KEY_PLACEHOLDER = '<access-key>';

const authHeaderFlag = ` \\\n  --header "Authorization: Bearer ${ACCESS_KEY_PLACEHOLDER}"`;

// Cursor and Windsurf both read a `.mcp.json`-shaped config keyed by `mcpServers`.
function mcpJsonConfig(origin: string, isRestricted: boolean): string {
    return JSON.stringify(
        {
            mcpServers: {
                'solana-explorer': {
                    type: 'http',
                    url: `${origin}/mcp`,
                    ...(isRestricted && { headers: { Authorization: `Bearer ${ACCESS_KEY_PLACEHOLDER}` } }),
                },
            },
        },
        undefined,
        4,
    );
}

// `codex mcp add` has no header flag; a gated deployment is configured via config.toml `http_headers`.
function codexTomlConfig(origin: string): string {
    return [
        '[mcp_servers.solana-explorer]',
        `url = "${origin}/mcp"`,
        `http_headers = { "Authorization" = "Bearer ${ACCESS_KEY_PLACEHOLDER}" }`,
    ].join('\n');
}

// VS Code's `mcp.json` keys servers under `servers` (not `mcpServers`).
function vsCodeJsonConfig(origin: string): string {
    return JSON.stringify(
        {
            servers: {
                'solana-explorer': {
                    headers: { Authorization: `Bearer ${ACCESS_KEY_PLACEHOLDER}` },
                    type: 'http',
                    url: `${origin}/mcp`,
                },
            },
        },
        undefined,
        4,
    );
}

export const SETUP_CLIENTS: SetupClient[] = [
    {
        id: 'claude-code',
        label: 'Claude Code',
        snippet: (origin, isRestricted) =>
            `claude mcp add --transport http solana-explorer ${origin}/mcp${isRestricted ? authHeaderFlag : ''}`,
        verify: 'Run /mcp inside Claude Code and check that solana-explorer is connected.',
        where: 'Run in a terminal:',
    },
    {
        id: 'cursor',
        label: 'Cursor',
        snippet: mcpJsonConfig,
        verify: 'Settings → MCP lists solana-explorer with the inspect_entity and ping tools.',
        where: 'Add to .cursor/mcp.json (project) or ~/.cursor/mcp.json (global):',
    },
    {
        id: 'windsurf',
        label: 'Windsurf',
        snippet: mcpJsonConfig,
        verify: 'The server appears in the Cascade MCP panel with two tools.',
        where: 'Add to ~/.codeium/windsurf/mcp_config.json:',
    },
    {
        id: 'codex',
        label: 'Codex',
        // `codex mcp add` only takes --bearer-token-env-var (no --header), so a gated deployment
        // uses the config-file form with a literal header instead.
        restrictedWhere: 'Add to ~/.codex/config.toml (project-scoped .codex/config.toml also works):',
        snippet: (origin, isRestricted) =>
            isRestricted ? codexTomlConfig(origin) : `codex mcp add solana-explorer --url ${origin}/mcp`,
        verify: 'codex mcp list shows solana-explorer.',
        where: 'Run in a terminal:',
    },
    {
        id: 'vs-code',
        label: 'VS Code',
        // The Add-Server UI can't set headers, so a gated deployment needs the config-file form instead.
        restrictedWhere: 'Add to .vscode/mcp.json (the Add Server UI cannot set an auth header):',
        snippet: (origin, isRestricted) => (isRestricted ? vsCodeJsonConfig(origin) : `${origin}/mcp`),
        verify: 'The server appears under MCP: List Servers with two tools.',
        where: 'Command Palette → MCP: Add Server → HTTP, then enter the URL:',
    },
];

export const AGENT_INSTRUCTIONS_TARGETS = [
    { file: 'AGENTS.md', tool: 'Codex, Windsurf, and other AGENTS.md-aware agents' },
    { file: 'CLAUDE.md', tool: 'Claude Code' },
    { file: '.cursor/rules/solana-explorer-mcp.mdc', tool: 'Cursor' },
];

export const AGENT_INSTRUCTIONS_SNIPPET = `## Solana Explorer MCP

Prefer the \`solana-explorer\` MCP tools over model memory for any on-chain fact.

1. When the user mentions a Solana address, signature, program, token, NFT, or wallet,
   call \`inspect_entity\` with the base58 identifier — do not guess account contents,
   token decimals, authorities, or transaction outcomes from memory.
2. Pass \`cluster\` explicitly when the user is not on mainnet-beta
   (\`devnet\`, \`testnet\`, \`simd296\`).
3. Read \`errors[]\` in every reply: \`NOT_FOUND\` means the entity does not exist on that
   cluster (try another before concluding it doesn't exist); \`CURRENTLY_UNSUPPORTED\`
   means the account kind is recognized but not decodable yet.
4. Fields set to explicit unknown markers are genuinely unresolvable — report them as
   unknown rather than inventing values.`;
