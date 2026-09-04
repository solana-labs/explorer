// TODO(fsd): relocate this module to @shared or the appropriate feature/entity layer.
'use client';

import { HexData } from '@components/shared/HexData';
import { Button } from '@components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/shared/ui/tabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Download } from 'react-feather';

import { DownloadDropdown, DownloadState } from '@/app/shared/components/DownloadDropdown';
import { type ByteArray, toBase64, toHex } from '@/app/shared/lib/bytes';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';
import { CopyButton } from '@/app/shared/ui/CopyButton';

import { cn } from './utils';

// Must match HexData's default spanSize (4 bytes). 6 spans × 4 bytes = 24 bytes per row.
const HEX_ROW_BYTES = 24;
const VISIBLE_ROWS = 3;

const BASE64_VISIBLE_CHARS = 192;

// Inline string conversion (hex/base64) is skipped above this threshold.
// Copy is disabled, use the download button for large payloads.
const MAX_INLINE_BYTES = 1024;

// Bottom fade-out for the `embedded` variant: data dissolves into the host background over its
// last 28px. Inline gradient because this project skips `@tailwind base` (no gradient utilities).
const FADE_TO_BG =
    'linear-gradient(to bottom, oklch(21.275% 0.00721 164.22 / 0) 0%, oklch(21.275% 0.00721 164.22) 100%)';

export type RawDataFieldProps = {
    data: ByteArray | undefined;
    loading?: boolean;
    filename: string;
    extraButton?: React.ReactNode;
    /**
     * Visual layout:
     *   `popover`  — self-contained card (border + bg + rounding + capped width).
     *   `embedded` — chromeless, full-width; byte count + Hex/Base64 tabs on top,
     *                copy/download on the bottom. The collapsed 4-row clamp is
     *                revealed inline via an Expand/Collapse toggle ("Show more").
     */
    variant?: 'popover' | 'embedded';
    /**
     * `popover` only: render the copy/download actions icon-only (drops their
     * `md:inline` text labels). Useful when the popover sits in a narrow host
     * (e.g. the mobile drawer) where the labels would crowd the header.
     */
    iconOnlyActions?: boolean;
    /**
     * Optional muted caption rendered immediately before the "N bytes" count
     * (e.g. `"Size "`). Used when the host drops its own "Size (bytes)" label and
     * folds it into the field itself.
     */
    bytesPrefix?: string;
};

export function RawDataField({
    data,
    loading,
    filename,
    extraButton,
    variant = 'popover',
    iconOnlyActions,
    bytesPrefix,
}: RawDataFieldProps) {
    const [tab, setTab] = useState<'hex' | 'base64'>('hex');
    const [expanded, setExpanded] = useState(false);
    const [copyState, copy] = useCopyToClipboard();
    const [downloadState, setDownloadState] = useState<DownloadState>(DownloadState.Idle);

    useEffect(() => {
        if (downloadState === DownloadState.Downloaded) {
            const t = setTimeout(() => setDownloadState(DownloadState.Idle), 1000);
            return () => clearTimeout(t);
        }
    }, [downloadState]);

    useEffect(() => {
        setExpanded(false);
    }, [data]);

    const hasData = data !== undefined && data.length > 0;
    const tooLarge = data !== undefined && data.length > MAX_INLINE_BYTES;

    const hexString = useMemo(() => (data && data.length > 0 ? toHex(data) : ''), [data]);
    const base64String = useMemo(() => (data && data.length > 0 ? toBase64(new Uint8Array(data)) : ''), [data]);

    const hasMoreHex = data !== undefined && data.length > VISIBLE_ROWS * HEX_ROW_BYTES;
    const visibleData = !expanded && hasMoreHex ? data.subarray(0, VISIBLE_ROWS * HEX_ROW_BYTES) : data;

    const hasMoreBase64 = base64String.length > BASE64_VISIBLE_CHARS;
    const visibleBase64 = expanded ? base64String : base64String.slice(0, BASE64_VISIBLE_CHARS);

    const hasMore = (tab === 'hex' && hasMoreHex) || (tab === 'base64' && hasMoreBase64);

    // Collapsed embedded view is clamped to 4 rows via CSS; measure whether the
    // (fully-rendered) data actually overflows that clamp so the fade + "Show more"
    // spoiler only appear when there's more to reveal. Byte counts can't tell us this
    // once the hex wraps responsively — only the rendered height can.
    const dataRef = useRef<HTMLDivElement>(null);
    const [clamped, setClamped] = useState(false);
    useEffect(() => {
        const el = dataRef.current;
        if (!el) return;
        const measure = () => setClamped(el.scrollHeight - el.clientHeight > 1);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [data, tab, loading, expanded]);

    const handleTabChange = (value: string) => {
        if (value === 'hex' || value === 'base64') {
            if (value !== tab) setExpanded(false);
            setTab(value);
        }
    };

    // ---- Embedded variant -------------------------------------------------
    // Chromeless, full-width layout for the mobile drawer. The collapsed 4-row
    // clamp is revealed inline via an Expand/Collapse toggle ("Show more"). Expanding
    // drops the max-height clamp so the full payload flows inline.
    if (variant === 'embedded') {
        const clampData = !expanded;
        const tabsList = (
            <TabsList>
                <TabsTrigger className="flex-1 !py-0 text-sm" value="hex">
                    Hex
                </TabsTrigger>
                <TabsTrigger className="flex-1 !py-0 text-sm" value="base64">
                    Base64
                </TabsTrigger>
            </TabsList>
        );

        const byteCount = (
            <span className="whitespace-nowrap text-sm text-white">
                {data !== undefined && !loading && (
                    <>
                        {bytesPrefix && <span className="text-outer-space-300">{bytesPrefix}</span>}
                        {`${data.length} bytes`}
                    </>
                )}
            </span>
        );

        const copyButton = (
            <CopyButton value={tab === 'base64' ? base64String : hexString} disabled={!hasData || loading} />
        );

        // Icon-only trigger (no "Download" label): this layout is the mobile drawer.
        const downloadButton = (
            <DownloadDropdown filename={filename} data={data} loading={loading} disabled={!hasData} encodings={[tab]}>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-outer-space-800"
                    aria-label="Download"
                    disabled={!hasData || loading}
                >
                    <Download size={12} />
                </Button>
            </DownloadDropdown>
        );

        const renderPanes = (paneClassName: string) => (
            <>
                <TabsContent value="hex" className={cn('overflow-y-auto text-start', paneClassName)}>
                    {loading ? (
                        <span className="spinner-grow spinner-grow-sm" />
                    ) : !hasData ? (
                        // Explicit empty state (flush-left) instead of HexData's own "No data",
                        // whose p-1.5 would indent the text past the byte-count label.
                        <span className="text-sm text-outer-space-200">No data</span>
                    ) : tooLarge ? (
                        <span className="text-sm text-outer-space-200">Too large to display - use download/copy.</span>
                    ) : (
                        <HexData
                            className="w-full"
                            raw={data ?? new Uint8Array(0)}
                            isCopyable={false}
                            rowSize={HEX_ROW_BYTES}
                            align="start"
                            wrap
                        />
                    )}
                </TabsContent>
                <TabsContent value="base64" className={cn('overflow-y-auto text-start', paneClassName)}>
                    {loading ? (
                        <span className="spinner-grow spinner-grow-sm" />
                    ) : !hasData ? (
                        <span className="text-sm text-outer-space-200">No data</span>
                    ) : tooLarge ? (
                        <span className="text-sm text-outer-space-200">Too large to display - use download/copy.</span>
                    ) : (
                        <span className="text-wrap break-all font-mono text-sm text-white">{base64String}</span>
                    )}
                </TabsContent>
            </>
        );

        return (
            <Tabs value={tab} onValueChange={handleTabChange} className="w-full overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                    {byteCount}
                    {tabsList}
                </div>

                {/* Collapsed: show at most 4 rows; the rest is revealed inline via the
                    bottom "Show more" toggle. max-h-[5rem] = pane (0.25rem) + <pre>
                    padding (0.75rem) + 4×1rem line-height. Expanded drops the clamp. */}
                <div ref={dataRef} className={cn('relative overflow-hidden', clampData && 'max-h-[5rem]')}>
                    {renderPanes('py-0.5')}
                    {clamped && clampData && (
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                            style={{ backgroundImage: FADE_TO_BG }}
                        />
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    {hasData && !loading && !tooLarge && (clamped || expanded) ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-outer-space-800"
                            onClick={() => setExpanded(e => !e)}
                        >
                            <span className="text-outer-space-300">{expanded ? 'Show less' : 'Show more'}</span>
                            <ChevronDown
                                size={14}
                                className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'}
                            />
                        </Button>
                    ) : (
                        <span />
                    )}
                    <div className="flex items-center gap-2">
                        {downloadButton}
                        {copyButton}
                    </div>
                </div>
            </Tabs>
        );
    }

    // ---- Popover variant (default) ----------------------------------------
    return (
        <Tabs
            value={tab}
            onValueChange={handleTabChange}
            // we need to do -32px because this is padding for left and right 16px
            className="max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-solid border-outer-space-800 bg-heavy-metal-900 lg:max-w-[540px]"
        >
            <div
                className={cn(
                    'flex justify-between border-b border-outer-space-800 px-3 [border-bottom-style:solid]',
                    // Icon-only actions (narrow host, e.g. the mobile drawer): keep the tabs +
                    // byte count + buttons on one line — no wrap, tighter gap. The default keeps
                    // the roomy wrapping header.
                    iconOnlyActions ? 'flex-nowrap items-center gap-3' : 'flex-wrap gap-8',
                )}
            >
                <TabsList>
                    <TabsTrigger className="!py-2 text-xs" value="hex">
                        Hex
                    </TabsTrigger>
                    <TabsTrigger className="!py-2 text-xs" value="base64">
                        Base64
                    </TabsTrigger>
                </TabsList>
                <div className="flex min-w-0 items-center gap-2">
                    {data !== undefined && !loading && (
                        <span className="whitespace-nowrap text-xs text-outer-space-300">{data.length} bytes</span>
                    )}
                    {extraButton}
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label="Copy"
                        disabled={!hasData || loading}
                        onClick={() => copy(tab === 'base64' ? base64String : hexString)}
                    >
                        {copyState === 'copied' ? <Check size={12} /> : <Copy size={12} />}
                        {!iconOnlyActions && (
                            <span className="hidden md:inline">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
                        )}
                    </Button>
                    <DownloadDropdown
                        filename={filename}
                        data={data}
                        loading={loading}
                        disabled={!hasData}
                        encodings={[tab]}
                        onDownload={() => setDownloadState(DownloadState.Downloaded)}
                    >
                        <Button variant="outline" size="sm" aria-label="Download" disabled={!hasData || loading}>
                            {downloadState === DownloadState.Downloaded ? <Check size={12} /> : <Download size={12} />}
                            {!iconOnlyActions && (
                                <span className="hidden md:inline">
                                    {downloadState === DownloadState.Downloaded ? 'Downloaded!' : 'Download'}
                                </span>
                            )}
                        </Button>
                    </DownloadDropdown>
                </div>
            </div>

            <TabsContent
                value="hex"
                className={cn('max-h-80 overflow-y-auto p-1.5 text-start', loading && 'p-3', tooLarge && 'px-3 py-2')}
            >
                {loading ? (
                    <span className="spinner-grow spinner-grow-sm" />
                ) : tooLarge ? (
                    <span className="text-sm text-outer-space-200">Too large to display - use download/copy.</span>
                ) : (
                    <HexData
                        className="w-full"
                        raw={visibleData ?? new Uint8Array(0)}
                        isCopyable={false}
                        rowSize={HEX_ROW_BYTES}
                        align="start"
                    />
                )}
            </TabsContent>

            <TabsContent
                value="base64"
                className={cn('max-h-80 overflow-y-auto p-3 text-start', !loading && data?.length && 'py-2')}
            >
                {loading ? (
                    <span className="spinner-grow spinner-grow-sm" />
                ) : !hasData ? (
                    <span className="text-sm text-outer-space-200">No data</span>
                ) : tooLarge ? (
                    <span className="text-sm text-outer-space-200">Too large to display - use download/copy.</span>
                ) : (
                    <span className="text-wrap break-all font-mono text-xs text-white">
                        {visibleBase64}
                        {!expanded && hasMoreBase64 && '…'}
                    </span>
                )}
            </TabsContent>

            {hasMore && !tooLarge && !loading && hasData && (
                <div className="mt-1 flex justify-center border-t border-outer-space-800 [border-top-style:solid]">
                    <Button
                        variant="ghost"
                        className="hover:!bg-transparent"
                        size="sm"
                        onClick={() => setExpanded(e => !e)}
                    >
                        <span className="text-xs text-outer-space-300">{expanded ? 'Show less' : 'Show more'}</span>
                        <ChevronDown
                            size={14}
                            className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'}
                        />
                    </Button>
                </div>
            )}
        </Tabs>
    );
}
