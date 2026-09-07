'use client';

import React, { useState } from 'react';
import { Tool } from 'react-feather';

import { cn } from '@/app/components/shared/utils';
import { Card } from '@/app/shared/ui/Card';

import { scrollSectionToTop, useStickyRelease } from '../lib/useStickyTabs';

/**
 * Table inside an example answer, mirroring the tables the agent printed.
 *
 * `breakAnywhere` controls the wrapping mode. Default (`false`) wraps at word
 * boundaries (`break-words`): each column keeps a min-content width equal to its
 * longest word, so auto-layout sizes columns to content instead of starving them
 * to one character per line. Set it for tables whose cells hold long unbreakable
 * values (base58 addresses) that must break mid-token to keep the table narrow.
 */
function AnswerTable({
    head,
    rows,
    breakAnywhere = false,
}: {
    head: string[];
    rows: string[][];
    breakAnywhere?: boolean;
}) {
    const wrap = breakAnywhere ? '[overflow-wrap:anywhere]' : 'break-words';
    return (
        <>
            {/* Mobile: a real multi-column table can't fit a phone, so stack each row as labelled
                key/value pairs — readable without horizontal scroll. */}
            <div className="rounded-lg border border-solid border-white/10 sm:hidden">
                {rows.map((row, rowIndex) => (
                    <div
                        key={row[0]}
                        className={cn(
                            'flex flex-col gap-2 p-3',
                            rowIndex > 0 && 'border-0 border-t border-solid border-white/10',
                        )}
                    >
                        {row.map((cell, columnIndex) => (
                            <div key={head[columnIndex]} className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                                    {head[columnIndex]}
                                </span>
                                <span className={cn('text-xs text-neutral-300', wrap)}>{cell}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Desktop: the real table. The rounded outer border lives on the wrapper (kept intact by the
                scroll container's clipping); cells draw only the inner grid lines, so no corner border is lost. */}
            <div className="hidden overflow-x-auto rounded-lg border border-solid border-white/10 sm:block">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr>
                            {head.map(title => (
                                <th
                                    key={title}
                                    className={cn(
                                        'border-0 border-b border-r border-solid border-white/10 px-2.5 py-1.5 text-left font-medium text-neutral-400 last:border-r-0',
                                        wrap,
                                    )}
                                >
                                    {title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row[0]}>
                                {row.map(cell => (
                                    <td
                                        key={cell}
                                        className={cn(
                                            'border-0 border-r border-t border-solid border-white/10 px-2.5 py-1.5 align-top text-neutral-300 last:border-r-0',
                                            wrap,
                                        )}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

/** Bold intra-answer heading, standing in for the terminal's highlighted lines. */
function AnswerHeading({ children }: { children: React.ReactNode }) {
    return <p className="m-0 font-medium text-white">{children}</p>;
}

// Real conversations with a coding agent connected to this MCP server, shortened
// without losing the facts; the long tails sit in `more` behind "Expand message".
const EXAMPLES: { answer: React.ReactNode; label: string; more?: React.ReactNode; question: string; tool: string }[] = [
    {
        answer: (
            <>
                <p className="m-0">{'USDC (EPjFWdd5...) — SPL Token mint on mainnet-beta:'}</p>
                <AnswerTable
                    breakAnywhere
                    head={['Field', 'Value']}
                    rows={[
                        ['Mint authority', 'BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG'],
                        ['Supply', '7748676460441051 raw → 7,748,676,460.441051 USDC'],
                        ['Decimals', '6'],
                    ]}
                />
                <p className="m-0">
                    {
                        'Supply is variable (mint authority present); freeze authority is 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar.'
                    }
                </p>
            </>
        ),
        label: 'Token mint',
        question: 'What are the mint authority, supply and decimals of EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?',
        tool: 'inspect_entity',
    },
    {
        answer: (
            <>
                <p className="m-0">
                    {'Squads Multisig Program (SQDS4ep65T...) — BPF upgradeable-loader program on mainnet-beta.'}
                </p>
                <p className="m-0">
                    {
                        'Upgradeable: no — upgrade_authority: null, the authority was revoked, so the program is frozen. Last deployed at slot 302582236; executable data lives at Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n.'
                    }
                </p>
                <p className="m-0">
                    {
                        'IDL: yes — published on-chain via Anchor, served as Codama, program name "Squads Multisig Program".'
                    }
                </p>
                <p className="m-0">
                    {
                        'Extras: a verified build against Squads-Protocol/v4 @ 2a47b4c (signer sqdcVVoTcKZjXU8yPUwKFbGx1Hig1rhbWJQtMRXp2E1) and an embedded security.txt — audited by OtterSec and Neodyme, contact security@sqds.io.'
                    }
                </p>
            </>
        ),
        label: 'Program inspection',
        question: 'Inspect SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf — is it upgradeable and does it publish an IDL?',
        tool: 'inspect_entity',
    },
    {
        answer: (
            <>
                <p className="m-0">
                    {
                        'A v0 message, success, finalized at slot 439023338. One signer: EVybKZ6kp8CccQSkcAdfsstG5aX8mbQQC6jrKTcuFhVp. Fee 5000 lamports, CU consumed 67888; 53 accounts total, 34 pulled in from 5 address lookup tables.'
                    }
                </p>
                <p className="m-0">
                    {
                        'There are no inner instructions — anywhere: three invoke [1] lines in the logs and no [2] depth at all. That is the most interesting fact in this transaction.'
                    }
                </p>
            </>
        ),
        label: 'Transaction walkthrough',
        more: (
            <>
                <AnswerHeading>Instruction 1 — ComputeBudget</AnswerHeading>
                <p className="m-0">
                    {
                        'SetComputeUnitLimit, value 600,000. No SetComputeUnitPrice anywhere, so no priority fee — the 5000 lamport fee is base fee only.'
                    }
                </p>
                <AnswerHeading>Instruction 2 — System transfer</AnswerHeading>
                <p className="m-0">
                    {
                        'system::transfer, 1002 lamports from EVybKZ6k… (the signer) → Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY. Trivially small, and not a Jito tip pattern.'
                    }
                </p>
                <AnswerHeading>
                    Instruction 3 — unknown program 8GCr9711iFUmGdW4vPGoBYHoLEACKHKY8aycYNuxViXk
                </AnswerHeading>
                <p className="m-0">
                    {
                        'The whole payload of the transaction: 53 account references, 154 bytes of data, 67,588 CU consumed. Not decodable — the program is unverified and publishes no IDL (authority 2zYaeycd8jK1RjH9ZXLTHJp13xjmdC5FhPpSWtZrsXwp, deployed at slot 436916586), so the instruction stays raw.'
                    }
                </p>
                <p className="m-0">
                    {
                        'The account list still talks: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo (Meteora DLMM), pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA (PumpSwap AMM) plus pfeeUxB6… (PumpSwap fee config), full token infra, and pool/vault-looking accounts from the lookup tables — a multi-venue swap router shape.'
                    }
                </p>
                <AnswerHeading>The thing worth flagging</AnswerHeading>
                <p className="m-0">
                    {
                        'A 53-account instruction touching two AMM programs issued zero CPIs — it burned 67.5k CU reading accounts and returned success without invoking Token, Meteora, or PumpSwap even once. The consistent read (inference, not proof) is an arbitrage/MEV bot: load candidate pools, compute profitability on-chain, exit cleanly when the opportunity is not there. For certainty you would need the program source or a dump of its executable data (FkFnystz3DzSqDr3o64nLsUkecA9dvd9nNTrHZZBCtwQ).'
                    }
                </p>
                <p className="m-0">
                    {
                        'The 154-byte payload has no recognizable Anchor discriminator; two constants stand out — e8764817 = 390,000,000 (0.39 SOL if lamports) and a trailing f64 1.0, which reads like a threshold/slippage parameter.'
                    }
                </p>
            </>
        ),
        question:
            'Walk me through this transaction signature 3MVAxtaFp76y23DBd3MdXTEjpzH8zFtVB1HtVdYSKqZPpx1R9gEkDXCF9bX26vkAvyerz2K54eMCFF7cPpkzArM1 instruction by instruction, including inner instructions.',
        tool: 'inspect_entity',
    },
    {
        answer: (
            <>
                <p className="m-0">
                    {
                        '"Sent from my Pumpfun App" (App) — Token-2022 mint, 6 decimals, supply 912,905,455.031061 App, fixed.'
                    }
                </p>
                <p className="m-0">{'Only two extensions, and nobody can change any of them:'}</p>
                <AnswerTable
                    head={['Extension', 'Current state', 'Who can change it']}
                    rows={[
                        ['metadataPointer', 'points at the mint itself', 'authority: null — nobody'],
                        [
                            'tokenMetadata',
                            'name "Sent from my Pumpfun App", symbol "App", uri, no additional fields',
                            'updateAuthority: null — nobody',
                        ],
                    ]}
                />
            </>
        ),
        label: 'Token-2022 extensions',
        more: (
            <>
                <p className="m-0">
                    {
                        'Mint and freeze authorities are also null (supply_type: fixed), and the extensions that carry real issuer power are simply absent: no permanentDelegate, no transferHook, no transferFeeConfig, no confidential-transfer config. There is no key anywhere with authority over this mint.'
                    }
                </p>
                <p className="m-0">
                    {
                        'Two caveats before reading that as "safe": the on-chain metadata pointer is frozen, but it points at https://md.sdfgsdfsdf.uk/metadata/XGrhDXnd — whoever controls that domain can change the name, image and description at any time; and mint-level renunciation says nothing about liquidity or holder concentration — no authority to rug the mint ≠ no way to rug.'
                    }
                </p>
                <p className="m-0">
                    {
                        'Incidentally, this mint appeared in the transaction above — one of the read-only accounts pulled in from lookup table BMAAGcWbUNNVE15DpETYXBW7L1Ba4jqq1JywECkzNLSW in instruction 3, consistent with scanning pools for this token and finding nothing worth executing.'
                    }
                </p>
            </>
        ),
        question:
            'Which Token-2022 extensions are enabled on this mint 49nkLrXi8nCZBVKsShDNasEtPe4Vn1mx9Xbr3kTa8pTL, and who can still change them?',
        tool: 'inspect_entity',
    },
];

/**
 * Chat-app layout: example titles as a "chat list" beside a vertical divider,
 * the selected conversation on the right. Click a title to switch conversations.
 * Long conversations start collapsed behind "Expand message" and collapse again
 * on every conversation change.
 */
export function ExamplesCarousel() {
    const [index, setIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const sticky = useStickyRelease();

    const active = EXAMPLES[index];

    return (
        <Card variant="tight" ref={sticky.sectionRef} className="mb-12 !border-white/10 !bg-transparent">
            <div className="flex flex-col sm:flex-row">
                {/* Chat list — mobile: a sticky, horizontal, scrollable underline tab strip (like Setup/Tools);
                    desktop: a static vertical sidebar with a left-bar active marker. */}
                <div
                    ref={sticky.stripRef}
                    role="tablist"
                    aria-label="Examples"
                    className={cn(
                        'sticky top-0 z-10 flex shrink-0 flex-row gap-x-5 overflow-x-auto rounded-t-[11px] border-0 border-b border-solid border-white/10 bg-dark-background px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                        'sm:static sm:z-auto sm:w-52 sm:flex-col sm:gap-x-0 sm:overflow-visible sm:rounded-none sm:border-b-0 sm:border-r sm:bg-transparent sm:px-0 sm:py-3',
                    )}
                >
                    {EXAMPLES.map((example, exampleIndex) => {
                        const isActive = exampleIndex === index;
                        return (
                            <button
                                key={example.label}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => {
                                    setIndex(exampleIndex);
                                    // Switching chats collapses the long tail and resets scroll to the top.
                                    setExpanded(false);
                                    scrollSectionToTop(sticky.sectionRef.current);
                                }}
                                className={cn(
                                    'cursor-pointer whitespace-nowrap border-0 bg-transparent px-0 py-4 text-left text-sm transition-colors sm:px-4 sm:py-3',
                                    // Active marker: underline on mobile, left bar on the desktop sidebar.
                                    'border-b-2 border-solid sm:border-b-0 sm:border-l-2',
                                    isActive
                                        ? 'border-dark-accent text-white sm:bg-heavy-metal-900'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-200 sm:hover:bg-heavy-metal-900',
                                )}
                            >
                                {example.label}
                            </button>
                        );
                    })}
                </div>

                {/* Conversation view: only the selected conversation is rendered. */}
                <div className="min-w-0 grow">
                    <div className="flex flex-col gap-2 p-4 sm:p-6">
                        <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-solid border-white/10 bg-white/10 px-4 py-2.5 text-sm leading-relaxed text-white [overflow-wrap:anywhere]">
                            {active.question}
                        </div>
                        <div className="flex items-center gap-1.5 self-start px-1 text-xs text-neutral-500">
                            <Tool size={12} aria-hidden />
                            <span>
                                Ran <span className="font-mono text-neutral-400">{active.tool}</span> · Explorer MCP
                            </span>
                        </div>
                        <div className="flex max-w-[85%] flex-col gap-3 self-start rounded-2xl rounded-bl-md border border-solid border-white/10 bg-white/5 px-4 py-2.5 text-sm leading-relaxed text-neutral-300 [overflow-wrap:anywhere]">
                            {active.answer}
                            {expanded && active.more}
                            {active.more !== undefined && !expanded && (
                                <button
                                    type="button"
                                    onClick={() => setExpanded(true)}
                                    // Match the link hover: `<a>` darkens via the global `a:hover`;
                                    // a `<button>` isn't covered by it, so set the same token explicitly.
                                    className="cursor-pointer self-start border-0 bg-transparent p-0 text-xs font-medium text-dark-accent hover:text-dark-accent-hover"
                                >
                                    Expand message
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
