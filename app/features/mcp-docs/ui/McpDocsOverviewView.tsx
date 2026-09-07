'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { Card } from '@/app/shared/ui/Card';

import { AGENT_INSTRUCTIONS_SNIPPET, AGENT_INSTRUCTIONS_TARGETS, SETUP_CLIENTS } from '../lib/setup-clients';
import { useDeploymentOrigin } from '../lib/useDeploymentOrigin';
import { scrollSectionToTop, useStickyRelease } from '../lib/useStickyTabs';
import { CodeBlock } from './CodeBlock';
import { EndpointStatus, EndpointStatusValue } from './EndpointStatus';
import { ExamplesCarousel } from './ExamplesCarousel';
import { HeroFact } from './HeroFact';
import { InlineCode } from './InlineCode';
import { SectionTitle } from './SectionTitle';
import { ToolsShowcase } from './ToolsShowcase';

function probeState(status: number): EndpointStatus['state'] {
    if (status >= 500) return 'disabled';
    // 403 is only ever a blocked IP (route.ts rejects it before the key check), so no access key
    // or config change helps — keep it distinct from 401, which genuinely wants an access key.
    if (status === 403) return 'blocked';
    if (status === 401) return 'restricted';
    return 'ready';
}

export function McpDocsOverviewView() {
    const origin = useDeploymentOrigin();
    const [client, setClient] = useState(SETUP_CLIENTS[0].id);
    const [status, setStatus] = useState<EndpointStatus>({ state: 'checking' });
    const setupSticky = useStickyRelease();

    // Live health probe: a bare GET to /mcp answers 4xx when the endpoint is up (it wants a POST with
    // MCP headers) — that still means "reachable". 401 means the deployment gates access with a key
    // (MCP_ACCESS_KEYS set, per route.ts): the endpoint is up yet the open, key-less config this page
    // shows would be rejected, so surface it as "restricted". 403 is only a blocked IP (route.ts rejects
    // it before the key check), which no config fixes — surface it as "blocked". Only a 5xx counts as not
    // serving: 503 is the explicit "MCP disabled" sentinel (route.ts), and other 5xx / a network error
    // mean it can't be reached.
    useEffect(() => {
        const started = performance.now();
        fetch('/mcp')
            .then(response =>
                setStatus({
                    ms: Math.round(performance.now() - started),
                    state: probeState(response.status),
                }),
            )
            .catch(() => setStatus({ state: 'disabled' }));
    }, []);

    // A gated deployment (401/403) rejects the open, key-less config this page documents, so the copy
    // must stop asserting "no key required" and tell the visitor an access key is needed.
    const isRestricted = status.state === 'restricted';

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
            {/* Hero */}
            <h1 className="mb-4 mt-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Live on-chain data for coding agents
            </h1>
            <p className="mb-6 mt-0 text-lg leading-relaxed text-neutral-300">
                Connect your MCP client to the Explorer and let your agent read decoded on-chain state — accounts,
                programs, tokens and transactions — with the same IDL decoding and enrichments the Explorer renders.
            </p>
            <div className="mb-8 flex flex-wrap gap-3">
                {/* `!px-4` tightens the `lg` size's `px-8` (important beats it — cn has no tailwind-merge). */}
                <Button asChild variant="accent" size="lg" className="!px-4">
                    <a href="#setup" className="no-underline">
                        Set up your agent
                    </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="!px-4">
                    <a href="#tools" className="no-underline">
                        Browse the tools
                    </a>
                </Button>
            </div>
            <Card variant="tight" className="mb-12 !border-white/10 !bg-transparent">
                <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
                    <HeroFact label="Status">
                        <EndpointStatusValue status={status} />
                    </HeroFact>
                    <HeroFact label="Endpoint">
                        <a
                            href={`${origin}/mcp`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-dark-accent no-underline [overflow-wrap:anywhere]"
                        >
                            {`${origin}/mcp`}
                            <ExternalLink
                                size={12}
                                aria-hidden
                                className="relative -top-0.5 ml-1 inline align-text-bottom"
                            />
                        </a>
                    </HeroFact>
                    <HeroFact label="Transport">
                        <span className="text-sm">Streamable HTTP, stateless</span>
                    </HeroFact>
                    <HeroFact label="Auth">
                        {isRestricted ? (
                            <span className="text-sm text-amber-400">Access key required</span>
                        ) : (
                            <span className="text-sm">Open — no key required</span>
                        )}
                    </HeroFact>
                    <HeroFact label="Clusters">
                        <span className="text-sm">mainnet-beta · devnet · testnet · simd296</span>
                    </HeroFact>
                    <HeroFact label="Tools">
                        <span className="text-sm">inspect_entity · ping</span>
                    </HeroFact>
                </div>
            </Card>

            {/* Setup */}
            <SectionTitle
                id="setup"
                subtitle={
                    isRestricted
                        ? 'Pick your tool, copy the config — snippets already point at this deployment and carry an Authorization header. Replace <access-key> with the key this deployment was configured with before connecting.'
                        : 'Pick your tool, copy the config — snippets already point at this deployment. No API key needed.'
                }
            >
                Setup
            </SectionTitle>
            <Card
                variant="tight"
                ref={setupSticky.sectionRef}
                className="mb-12 !border-white/10 px-4 pb-4 pt-0 sm:px-6 sm:pb-6"
            >
                {isRestricted && (
                    <div className="-mx-4 mb-4 rounded-t-[11px] border-0 border-b border-solid border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 sm:-mx-6 sm:px-6">
                        This endpoint is gated — the snippets below include an <InlineCode>Authorization</InlineCode>{' '}
                        header; swap <InlineCode>&lt;access-key&gt;</InlineCode> for the key this deployment was
                        configured with.{' '}
                        <a
                            href="https://github.com/solana-foundation/explorer/blob/master/app/mcp/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-dark-accent no-underline"
                        >
                            How to run
                        </a>
                    </div>
                )}
                <Tabs
                    value={client}
                    onValueChange={value => {
                        setClient(value);
                        // Switching tabs resets scroll to the top of the (possibly shorter/taller) new panel.
                        scrollSectionToTop(setupSticky.sectionRef.current);
                    }}
                >
                    <TabsList
                        ref={setupSticky.stripRef}
                        // `!flex` overrides TabsList's base `inline-flex` (important beats it — cn has no tailwind-merge).
                        className="sticky top-0 z-10 -mx-4 mb-4 !flex flex-nowrap gap-x-5 overflow-x-auto rounded-t-[11px] border-b border-white/10 bg-heavy-metal-800 px-4 [scrollbar-width:none] sm:static sm:-mx-6 sm:rounded-none sm:bg-transparent sm:px-6 [&::-webkit-scrollbar]:hidden"
                    >
                        {SETUP_CLIENTS.map(({ id, label }) => (
                            <TabsTrigger key={id} value={id} className="shrink-0 whitespace-nowrap">
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {SETUP_CLIENTS.map(setupClient => (
                        <TabsContent key={setupClient.id} value={setupClient.id}>
                            <p className="mb-3 mt-0 text-sm text-neutral-300">
                                {isRestricted ? (setupClient.restrictedWhere ?? setupClient.where) : setupClient.where}
                            </p>
                            <CodeBlock code={setupClient.snippet(origin, isRestricted)} />
                            <p className="mb-0 mt-3 text-sm leading-relaxed text-neutral-300">
                                <span className="font-medium text-neutral-300">Verify:</span> {setupClient.verify}
                            </p>
                        </TabsContent>
                    ))}
                </Tabs>
            </Card>

            {/* Agent instructions */}
            <SectionTitle subtitle="Teach the agent to reach for the Explorer instead of guessing — add the block below to the instructions file your tool reads.">
                Agent instructions
            </SectionTitle>
            <Card variant="tight" className="mb-12 overflow-hidden !border-white/10">
                <p className="m-0 p-4 text-sm text-neutral-300 sm:p-6">
                    {AGENT_INSTRUCTIONS_TARGETS.map((target, index) => (
                        <React.Fragment key={target.file}>
                            {index > 0 && <span className="text-neutral-500"> / </span>}
                            <InlineCode>{target.file}</InlineCode>
                        </React.Fragment>
                    ))}
                </p>
                {/* Snippet as the card's bottom segment behind a full-width divider (no nested card). */}
                <div className="border-0 border-t border-solid border-white/10">
                    <CodeBlock variant="flush" wrap code={AGENT_INSTRUCTIONS_SNIPPET} />
                </div>
            </Card>

            {/* Tools */}
            <SectionTitle
                id="tools"
                subtitle="The server registers two tools. Both are read-only — nothing signs, sends or mutates."
            >
                Tools
            </SectionTitle>
            <ToolsShowcase />

            {/* Examples */}
            <SectionTitle subtitle="Things worth asking once the server is connected.">Examples</SectionTitle>
            <ExamplesCarousel />
        </div>
    );
}
