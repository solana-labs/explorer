'use client';

import React, { useState } from 'react';
import { Minus, Plus } from 'react-feather';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { Card } from '@/app/shared/ui/Card';

import { scrollSectionToTop, useStickyRelease } from '../lib/useStickyTabs';
import { CodeBlock } from './CodeBlock';
import { InlineCode } from './InlineCode';

const INSPECT_ENTITY_COVERS = [
    'SPL Token and Token-2022 mints, token accounts and multisigs, including parsed Token-2022 extensions.',
    'Upgradeable programs — upgradeability, upgrade authority, last deploy slot and on-chain IDL discovery.',
    'Stake, vote, nonce, sysvar, config, address lookup table and feature accounts.',
    'Compressed NFTs, nftoken accounts and Solana Attestation Service accounts.',
    'Transactions — signers, fee, status and instructions with inner instructions, decoded through IDL, bundled and raw sources.',
    'Accounts of unrecognised programs, decoded through the owner program’s on-chain IDL when it publishes one.',
];

// A real reply: USDC mint on mainnet-beta.
const INSPECT_ENTITY_RESPONSE = `{
    "payload": {
        "entity": {
            "kind": "spl-token:mint",
            "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "decimals": 6,
            "freeze_authority": "7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar",
            "is_initialized": true,
            "mint_authority": "BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG",
            "supply": "7902797573976355",
            "supply_type": "variable",
            "token_program": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
    },
    "errors": []
}`;

const TOOL_NAMES = ['inspect_entity', 'ping'] as const;

// Tab labels: plain words, capitalised. The tab `value` stays the raw tool name (it keys the panels).
const TOOL_LABELS: Record<(typeof TOOL_NAMES)[number], string> = {
    inspect_entity: 'Inspect entity',
    ping: 'Ping',
};

/** Tool reference behind the same underline-tab navigation as the Setup card. */
export function ToolsShowcase() {
    const [tool, setTool] = useState<string>(TOOL_NAMES[0]);
    const sticky = useStickyRelease();

    return (
        <Card variant="tight" ref={sticky.sectionRef} className="mb-12 !border-white/10 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <Tabs
                value={tool}
                onValueChange={value => {
                    setTool(value);
                    // Switching tabs resets scroll to the top of the new panel.
                    scrollSectionToTop(sticky.sectionRef.current);
                }}
            >
                <TabsList
                    ref={sticky.stripRef}
                    // `!flex` overrides TabsList's base `inline-flex` (important beats it — cn has no tailwind-merge).
                    className="sticky top-0 z-10 -mx-4 mb-4 !flex flex-nowrap gap-x-5 overflow-x-auto rounded-t-[11px] border-b border-white/10 bg-heavy-metal-800 px-4 [scrollbar-width:none] sm:static sm:-mx-6 sm:rounded-none sm:bg-transparent sm:px-6 [&::-webkit-scrollbar]:hidden"
                >
                    {TOOL_NAMES.map(name => (
                        <TabsTrigger key={name} value={name} className="shrink-0 whitespace-nowrap">
                            {TOOL_LABELS[name]}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="inspect_entity">
                    <InspectEntityDoc />
                </TabsContent>
                <TabsContent value="ping">
                    <PingDoc />
                </TabsContent>
            </Tabs>
        </Card>
    );
}

function InspectEntityDoc() {
    return (
        <div>
            <p className="m-0 text-base leading-relaxed text-neutral-300">
                Retrieves detailed on-chain data for any Solana address or transaction signature. The tool detects which
                one it was given.
            </p>

            <ToolDocDivider />
            <ToolDocSection title="What it covers" defaultOpen={false}>
                <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm leading-relaxed text-neutral-300">
                    {INSPECT_ENTITY_COVERS.map(item => (
                        <li key={item} className="flex gap-2">
                            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-neutral-600" aria-hidden />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </ToolDocSection>

            <ToolDocDivider />
            <ToolDocSection title="Request parameters">
                <div className="mt-3 flex flex-col gap-3">
                    <ToolParam name="identifier" required>
                        A base58 string, 1–128 characters: a 32-byte account address or a 64-byte transaction signature.
                    </ToolParam>
                    <ToolParam name="cluster">
                        One of <InlineCode>mainnet-beta</InlineCode>, <InlineCode>devnet</InlineCode>,{' '}
                        <InlineCode>testnet</InlineCode>, <InlineCode>simd296</InlineCode>. Defaults to{' '}
                        <InlineCode>mainnet-beta</InlineCode>.
                    </ToolParam>
                </div>
            </ToolDocSection>

            <ToolDocDivider />
            <ToolDocSection title="Response">
                <div className="mt-3">
                    <CodeBlock code={INSPECT_ENTITY_RESPONSE} />
                    <p className="mb-0 mt-4 text-sm leading-relaxed text-neutral-300">
                        Accounts owned by the legacy loaders are not supported yet and answer with a{' '}
                        <InlineCode>CURRENTLY_UNSUPPORTED</InlineCode> error. Fields that cannot be resolved come back
                        as explicit unknown markers rather than being dropped.
                    </p>
                </div>
            </ToolDocSection>
        </div>
    );
}

/** Collapsible tool-doc section: heading with the +/- right after it, framed by the dividers. */
function ToolDocSection({
    children,
    defaultOpen = true,
    title,
}: {
    children: React.ReactNode;
    defaultOpen?: boolean;
    title: string;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
                className="group flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
            >
                <h4 className="m-0 text-sm font-medium text-white">{title}</h4>
                <span className="text-neutral-500 transition-colors group-hover:text-dark-accent">
                    {open ? <Minus size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
                </span>
            </button>
            {open && children}
        </div>
    );
}

/** Full-bleed rule between the tool-doc sections (compensates the card padding). */
function ToolDocDivider() {
    return <div className="-mx-4 my-4 border-0 border-t border-solid border-white/10 sm:-mx-6" />;
}

function PingDoc() {
    return (
        <p className="m-0 text-base leading-relaxed text-neutral-300">
            Basic health tool. Takes no arguments and answers <InlineCode>pong</InlineCode>. Ask the agent to call it to
            verify the connection end-to-end.
        </p>
    );
}

function ToolParam({ name, required, children }: { name: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-baseline gap-2">
                <InlineCode>{name}</InlineCode>
                <span className="text-xs text-neutral-500">{required ? 'required' : 'optional'}</span>
            </div>
            <p className="mb-0 mt-1.5 text-sm leading-relaxed text-neutral-300">{children}</p>
        </div>
    );
}
