# `/mcp` endpoint

MCP server exposing the `@explorer/entity-inspector` tools over the
[Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http).
Stateless — a fresh server per request — so it is serverless-safe. Lives at `/mcp`, not `/api/*`, to escape the BotID
proxy matcher.

## Firewall

Production challenges every non-browser client, which is every MCP client, so `/mcp` is unreachable without these two
rules. Add them in the [firewall dashboard](https://vercel.com/solana-foundation/explorer/firewall) → ⋯ → Configure →
**Add New… → Rule**; semantics in [`docs/firewall.md`](../../docs/firewall.md).

`Bypass MCP endpoint` is the standing rule. `Rate limit MCP` ships **disabled** and is switched on in response to a
spike, so normal traffic is never metered.

It must still sit **above** the bypass — `Bypass` skips every rule after it, so the reverse order silently disables the
limit once you enable it. Where the pair sits in the overall list does not matter, since no other rule matches `/mcp`;
keep them adjacent so the constraint stays visible.

`MCP_ACCESS_KEYS` is a fallback, not the gate. With it unused and the limit off, `/mcp` is public, unauthenticated, and
unmetered by design — abuse runs until someone notices and enables the rule.

```
Name: Rate limit MCP
Description: Meters the public /mcp endpoint — unauthenticated, and does upstream RPC work per call: `^/mcp/?$`
Rule:
    If `Request Path` `Matches` `^/mcp/?$`
    Then `Rate Limit` — 100 requests per 60s, keyed by `IP`, fixed window
    Exceed action: `Default (429)`
```

```
Name: Bypass MCP endpoint
Description: Agent clients cannot solve the browser challenge: `^/mcp/?$`
Rule:
    If `Request Path` `Matches` `^/mcp/?$`
    Then `Bypass`
```

Once enabled, requests under the limit pass through to the bypass, so normal clients never notice it. Over the limit
they get `429` — a signal an HTTP client can act on, where `Log` would leave a misbehaving agent hammering and tell it
nothing.

Both patterns are anchored. `Starts with /mcp` would also exempt `/mcpx` and `/mcpfoo`, letting unmetered requests reach
the router for a 404. `^/mcp/?$` matches the route and its trailing-slash form, nothing else.

⚠️ Counters are per-region, so 100/60s is a per-region ceiling, not a global cap.

### Turning the screw

Escalate from the top. Leave the bypass alone until the last row.

| Change                                 | Effect                                              |
| -------------------------------------- | --------------------------------------------------- |
| Steady state — rate limit disabled     | Open, unmetered                                     |
| Enable `Rate limit MCP`                | Open under 100/60s per IP, abusers get `429`        |
| 30 req/60s, exceed → `Deny` for 10 min | Tighter, and repeat offenders blocked on every path |
| Disable `Bypass MCP endpoint`          | `/mcp` closed to everyone                           |

The last row is a kill switch, not a throttle. `Rate Limit` is not a milder `Bypass`: with the bypass off, requests
under the limit still reach Bot Filter and are challenged, so the endpoint is dark whatever the limit says. Use it only
when you mean to take `/mcp` down.

Exceed action `Log` counts without blocking. Use it to size a **new** limit against live traffic, never as a starting
state — it enforces nothing.

Per-IP blocking belongs in a firewall rule rather than `MCP_BLOCKED_IPS`: the rule sees real client IPs and applies
without a deploy. Analytics cannot stand in either — GA4 receives a hashed `client_id`, so it confirms an address you
already suspect but never hands you one to block
([`TELEMETRY.md`](../../packages/entity-inspector/TELEMETRY.md#client_id)).

### Preview deployments

Previews sit behind Deployment Protection, so clients must also present the
[Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
secret from **Project Settings → Deployment Protection**, as an `x-vercel-protection-bypass` header or
`?x-vercel-protection-bypass=<secret>` query param. It sits on top of the endpoint's own `Bearer` auth.

## Environment

Inert by default (`503`). Keys documented inline in [`.env.example`](../../.env.example): `MCP_ENDPOINT_ENABLED`,
`MCP_ACCESS_KEYS`, `MCP_BLOCKED_IPS`, `MCP_GA_MEASUREMENT_ID`, `MCP_GA_API_SECRET`, and
`MCP_SOLANA_RPC_URL_MAINNET_BETA` / `_DEVNET` / `_TESTNET`. Set them in **Project Settings → Environment Variables**,
then redeploy — keys and blocklist are parsed at module scope, so a change needs one.

Analytics stay off unless an API secret and a measurement id both resolve. Events are sent after the response via Next's
`after()`. Event names and the custom dimensions that must be registered in the GA4 property are in
[`TELEMETRY.md`](../../packages/entity-inspector/TELEMETRY.md) — until they are, GA4 collects the parameters but cannot
report on them.

`maxDuration = 60` applies to this route only.

## Enabled clusters

`app/shared/config/mcp-clusters.ts` holds `MCP_ENABLED_CLUSTER_NAMES`, passed to the handler as `enabledClusterNames`.
The `cluster` enum, the tool description, and the landing page all derive from it; anything outside it is rejected with
an input-validation error. The advertised default comes from the package's `defaultCluster`, which prefers
`mainnet-beta`.

The list is written out rather than aliased to the package's `SUPPORTED_CLUSTERS`, so a newly supported cluster is
opt-in here instead of going live with a package bump. Adding or removing an entry is the whole change —
`resolveRpcEndpoints` resolves a URL for every supported cluster either way, and the handler refuses to start if an
enabled cluster has none.

## Smoke test

The `initialize` → `tools/call ping` round-trip is exercised by
`packages/entity-inspector/src/mcp/__tests__/handler.integration.spec.ts`; curl equivalents for a live deployment are
documented on its `negotiatedToolRequest` helper.

## Agent config

`.mcp.json` (Claude Code, Cursor, and compatible clients) — omit the bypass header outside previews:

```json
{
    "mcpServers": {
        "solana-explorer": {
            "type": "http",
            "url": "https://<deployment>/mcp",
            "headers": {
                "Authorization": "Bearer <key>",
                "x-vercel-protection-bypass": "<secret>"
            }
        }
    }
}
```

Or via the Claude Code CLI:

```sh
claude mcp add --transport http solana-explorer https://<deployment>/mcp \
  --header "Authorization: Bearer <key>" \
  --header "x-vercel-protection-bypass: <secret>"
```
