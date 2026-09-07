# Usage telemetry

The package emits usage events through the optional `track` sink on `EntityInspectorConfig`. Event shapes live in
[`src/types.ts`](./src/types.ts); `mcp_tool_call` is derived in
[`src/mcp/analytics-event.ts`](./src/mcp/analytics-event.ts).

Tracking is best-effort: a throwing sink is caught and logged, never surfaced to the tool caller. With no `track` the
package emits nothing.

## Wiring

`@explorer/entity-inspector/telemetry/server` consumes events through a provider;
`@explorer/entity-inspector/telemetry/providers/ga4` is the GA4 Measurement Protocol provider. The host app supplies
credentials — for this repo, `MCP_GA_MEASUREMENT_ID` and `MCP_GA_API_SECRET` (see `app/mcp/README.md`). Missing
credentials disable the sink with a single warning.

For where to obtain the Measurement ID and generate the API secret, see
[Sending events to GA4 via the Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag).

## `client_id`

Required on every request: `measurement_id` and `api_secret` go in the URL, `client_id` in the JSON body, and
`session_id` + `engagement_time_msec` in every event's params (next section) — all sent by
[`src/telemetry/providers/ga4.ts`](./src/telemetry/providers/ga4.ts). The host app supplies `client_id` as
`context.clientId`; this repo resolves it in `app/mcp/telemetry.ts`:

| Source                             | Value sent                 |
| ---------------------------------- | -------------------------- |
| `mcp-session-id` header            | `sid_` + `sha256(session)` |
| else first `x-forwarded-for` entry | `ip_` + `sha256(clientIp)` |
| else                               | `anon`                     |

Hashed so no session token or raw IP reaches Google verbatim. The prefix keeps provenance legible: an `ip_` value
confirms or rules out an address you already suspect (hash it and compare), whereas a `sid_` value says nothing about
where the caller is. It cannot hand you an address you did not already have — which is why abuse handling belongs in a
Firewall rule rather than here (see `app/mcp/README.md`).

Three limits to read reports against. GA4 counts users by `client_id`, so a caller on the IP branch is really "one
address" — NAT collapses several callers into one, a rotating IP fans one caller into several. Every caller on the
`anon` branch collapses into a single GA4 user. And an unsalted SHA-256 over the 2³² IPv4 space is enumerable, so a
hashed IP is pseudonymous, not anonymous. Event counts are the trustworthy figure; user counts are indicative.

## `session_id` and `engagement_time_msec`

Without both, GA4 shows Measurement Protocol events in Realtime but excludes them from processed reports — the event
names never even appear in report filters or custom-definition pickers. Neither needs a custom definition: GA4 treats
them as reserved parameters.

`session_id` is derived in [`src/telemetry/providers/ga4.ts`](./src/telemetry/providers/ga4.ts) as FNV-1a over
`client_id`: one long-lived GA4 session per client, deliberately not time-boxed. The `client_id` collapse/fan-out limits
above therefore apply to session counts identically — sessions are not a meaningful figure here; event counts are.

`engagement_time_msec` is a constant `1` — the minimum positive value (GA4 counts Active Users on nonzero engagement
time, so `0` would zero out user-based reports). It deliberately makes no engagement claim: GA4's built-in _Average
engagement time_ is meaningless on this property; latency questions are answered by the `duration_ms` custom metric.

## Events

| Event            | Emitted when                                                 | Params    |
| ---------------- | ------------------------------------------------------------ | --------- |
| `mcp_initialize` | The server's `oninitialized` hook fires — one per handshake. | none      |
| `mcp_tool_call`  | A tool handler settles, on both success and error.           | see below |

Event names must keep the `mcp_` prefix and stay within GA4's 40-character limit — `Ga4EventNamesWithinLimit` in
`src/mcp/analytics-event.ts` fails the build otherwise.

## GA4 custom definitions to register

Unregistered parameters are collected but not reportable, so each one below needs a definition in **Admin → Data display
→ Custom definitions**. There is no event picker in the form — a definition resolves on whichever events carry its
parameter.

_Event parameter_ is the payload key and must match the table exactly, or the definition silently reports nothing.
_Dimension name_ is free-form report label; use the parameter verbatim so the two stay easy to correlate.

Register before enabling telemetry: definitions are not retroactive, so anything collected beforehand stays unreportable
through them. Reports lag creation by 24–48h.

GA4 warns about high-cardinality dimensions (>500 unique values a day, condensed into an `(other)` row). None apply
here: every value comes from a closed set, not caller input. `entity_kind` is the widest — the 22 account kinds in
[`src/accounts/kinds.ts`](./src/accounts/kinds.ts), plus `transaction` and the bare `account` a not-found reply carries.
Legacy-loader kinds arrive as ordinary entity payloads with no `error_code` — they route to real builders since
legacy-loader support landed. The caller-supplied `identifier` is deliberately never a parameter.

| Register as      | Event parameter / Dimension | Scope | Unit         | Carried by      | Values                                                                                                                                                                                     |
| ---------------- | --------------------------- | ----- | ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Custom dimension | `tool`                      | Event | —            | `mcp_tool_call` | `inspect_entity`, `ping`                                                                                                                                                                   |
| Custom dimension | `status`                    | Event | —            | `mcp_tool_call` | `success`, `error`                                                                                                                                                                         |
| Custom dimension | `cluster`                   | Event | —            | `mcp_tool_call` | Whichever clusters the deployment enables (`enabledClusterNames`); always present on `inspect_entity` — the schema defaults it, so an explicit request is indistinguishable from a default |
| Custom dimension | `entity_kind`               | Event | —            | `mcp_tool_call` | Any `entity.kind` the tool returns (`spl-token:mint`, `bpf-upgradeable-loader`, `transaction`, `unknown`, …); absent when the reply carried no entity                                      |
| Custom dimension | `decode_sources`            | Event | —            | `mcp_tool_call` | Sorted comma-joined subset of `idl`, `bundled`, `raw`; transactions only                                                                                                                   |
| Custom dimension | `error_code`                | Event | —            | `mcp_tool_call` | `INVALID_ARGUMENT`, `NOT_FOUND`, `CURRENTLY_UNSUPPORTED`, `INTERNAL_ERROR`; absent when the envelope reported no error                                                                     |
| Custom metric    | `duration_ms`               | Event | Milliseconds | `mcp_tool_call` | Handler wall time, integer                                                                                                                                                                 |

Six dimensions and one metric. A standard property allows 50 event-scoped dimensions and 50 event-scoped metrics from
separate budgets, so this spends 12% of the former and 2% of the latter — but the budget is per property, so a property
shared with the app's own analytics is already spending from it.

To register fewer, the useful order is `tool`, `status`, `error_code`, `entity_kind`, then `cluster` and
`decode_sources`. `tool` comes first because the landing page's status block calls `ping`: without it, that traffic is
indistinguishable from real agent calls and contaminates every other figure.

Notes:

- `ping` only ever carries `tool`, `status` and `duration_ms`; the rest are `inspect_entity`-only.
- `decode_sources` is deliberately a comma-joined scalar because GA4 parameters cannot hold arrays — `idl,raw` reads as
  "partially decoded".
- `status` is `error` for handled tool errors, which always pair with an `error_code`; a thrown handler never reaches
  the sink.
