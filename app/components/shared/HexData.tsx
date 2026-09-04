// TODO(fsd): relocate this module to @shared or the appropriate feature/entity layer.
import { Copyable } from '@components/common/Copyable';
import { cva } from 'class-variance-authority';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ByteArray, toHex } from '@/app/shared/lib/bytes';

import { cn } from './utils';

// Measure the wrapped hex layout before the browser paints so the column-based checkerboard doesn't
// flash from a flat single color on the first frame. Falls back to useEffect on the server, where
// there is no layout to measure anyway (and useLayoutEffect would warn).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type HexSpan = { text: string; variant: 'primary' | 'secondary' | 'secondary-old' };
export type HexRow = HexSpan[];

const SPAN_SIZE = 4;
const ROW_SIZE = 4 * SPAN_SIZE;
const TRUNCATE_EDGE_BYTES = 8;

export function splitHexPairs(hex: string): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        pairs.push(hex.slice(i, i + 2));
    }
    return pairs;
}

// Truncate pairs to head … tail, inserting an ellipsis marker.
// Returns the original pairs unchanged if below threshold.
export function truncateHexPairs(pairs: string[]): { pairs: string[]; truncated: boolean } {
    if (pairs.length <= TRUNCATE_EDGE_BYTES * 2) {
        return { pairs, truncated: false };
    }
    return {
        pairs: [...pairs.slice(0, TRUNCATE_EDGE_BYTES), '\u2026', ...pairs.slice(-TRUNCATE_EDGE_BYTES)],
        truncated: true,
    };
}

// Group pairs into alternating-color spans of SPAN_SIZE.
// The ellipsis marker (\u2026) gets its own span.
// When inverted, the first span is secondary-old and the second is primary (greenish first, white second).
export function formatHexSpans(pairs: string[], options: { inverted?: boolean } = {}, spanSize = SPAN_SIZE): HexSpan[] {
    const first: HexSpan['variant'] = options.inverted ? 'secondary-old' : 'primary';
    const second: HexSpan['variant'] = options.inverted ? 'primary' : 'secondary-old';
    const spans: HexSpan[] = [];
    let pairIndex = 0;

    for (let i = 0; i < pairs.length;) {
        if (pairs[i] === '\u2026') {
            spans.push({ text: '\u2026', variant: second });
            i++;
            continue;
        }

        const variant = pairIndex % (2 * spanSize) === 0 ? first : second;
        const chunk = pairs.slice(i, i + spanSize).filter(p => p !== '\u2026');
        spans.push({ text: chunk.join(' '), variant });
        pairIndex += spanSize;
        i += chunk.length;
    }

    return spans;
}

export function groupHexRows(spans: HexSpan[], rowSize = ROW_SIZE, spanSize = SPAN_SIZE): HexRow[] {
    const spansPerRow = rowSize / spanSize;
    const rows: HexRow[] = [];
    for (let i = 0; i < spans.length; i += spansPerRow) {
        rows.push(spans.slice(i, i + spansPerRow));
    }
    return rows;
}

const fullContentVariants = cva('items-center', {
    variants: {
        align: {
            end: 'justify-end',
            start: 'justify-start',
        },
    },
});

export function HexData({
    raw,
    className,
    copyableRaw,
    truncate = false,
    inverted = false,
    isCopyable = true,
    align = 'end',
    spanSize = SPAN_SIZE,
    rowSize = ROW_SIZE,
    wrap = false,
}: {
    raw: ByteArray;
    copyableRaw?: ByteArray;
    className?: string;
    truncate?: boolean;
    inverted?: boolean;
    // 'end' is the legacy default (right-aligned in table cells).
    align?: 'start' | 'end';
    isCopyable?: boolean;
    spanSize?: number;
    rowSize?: number;
    wrap?: boolean;
}) {
    if (!raw || raw.length === 0) {
        return (
            <div className={cn('p-1.5', fullContentVariants({ align }), className)}>
                <span className="text-sm text-outer-space-200">No data</span>
            </div>
        );
    }

    const hexString = toHex(raw);
    const copyText = copyableRaw ? toHex(copyableRaw) : hexString;

    if (truncate) {
        return (
            <TruncatedContent
                hexString={hexString}
                copyText={copyText}
                raw={raw}
                inverted={inverted}
                spanSize={spanSize}
            />
        );
    }

    return (
        <FullContent
            hexString={hexString}
            copyText={copyText}
            className={className}
            inverted={inverted}
            align={align}
            spanSize={spanSize}
            rowSize={rowSize}
            isCopyable={isCopyable}
            wrap={wrap}
        />
    );
}

const hexSpanVariants = cva('', {
    variants: {
        tone: {
            primary: 'text-white',
            secondary: 'text-gray-500',
            // Dashkit's text-gray-500 is rgb(171,213,198) — a teal-tinted gray.
            // Keep for backward compat until dashkit is fully removed.
            'secondary-old': 'text-[rgb(171,213,198)]',
        },
    },
});

function WrapContent({
    spans,
    className,
    copyText,
    inverted,
    isCopyable,
}: {
    spans: HexSpan[];
    className?: string;
    copyText: string | null;
    inverted: boolean;
    isCopyable: boolean;
}) {
    const preRef = useRef<HTMLPreElement>(null);
    const [cols, setCols] = useState(1);

    useIsomorphicLayoutEffect(() => {
        const el = preRef.current;
        if (!el) return;
        const measure = () => {
            const groups = el.querySelectorAll<HTMLElement>('[data-hex-group]');
            if (groups.length === 0) return;
            const firstTop = groups[0].offsetTop;
            let count = 0;
            for (const g of groups) {
                if (g.offsetTop !== firstTop) break;
                count++;
            }
            setCols(Math.max(1, count));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [spans]);

    const first: HexSpan['variant'] = inverted ? 'secondary-old' : 'primary';
    const second: HexSpan['variant'] = inverted ? 'primary' : 'secondary-old';

    const content = (
        // px-0 overrides the global `pre { padding: .33rem }` so the hex sits flush left.
        <pre
            ref={preRef}
            className="mb-0 block whitespace-normal bg-heavy-metal-900 px-0 py-1.5 text-left font-mono text-xs"
        >
            {spans.map((span, i) => (
                <React.Fragment key={i}>
                    <span
                        data-hex-group
                        className={cn(
                            'mr-3 inline-block whitespace-nowrap',
                            hexSpanVariants({ tone: (i % cols) % 2 === 0 ? first : second }),
                        )}
                    >
                        {span.text}
                    </span>{' '}
                </React.Fragment>
            ))}
        </pre>
    );

    return (
        <div className={cn('w-full', className)}>
            {isCopyable ? <Copyable text={copyText}>{content}</Copyable> : content}
        </div>
    );
}

function ColoredSpans({ spans }: { spans: HexSpan[] }) {
    return (
        <>
            {spans.map((span, i) => (
                <span key={i} className={hexSpanVariants({ tone: span.variant })}>
                    {span.text}{' '}
                </span>
            ))}
        </>
    );
}

function TruncatedContent({
    hexString,
    copyText,
    raw,
    inverted,
    spanSize,
}: {
    hexString: string;
    copyText: string | null;
    raw: ByteArray;
    inverted: boolean;
    spanSize: number;
}) {
    const { pairs: truncatedPairs, truncated } = truncateHexPairs(splitHexPairs(hexString));
    const spans = formatHexSpans(truncatedPairs, { inverted }, spanSize);

    return (
        <span className="inline-flex items-center gap-2 text-sm">
            <Copyable text={copyText}>
                <span className="font-mono text-xs">
                    <ColoredSpans spans={spans} />
                </span>
            </Copyable>
            {truncated && <span className="text-xs text-neutral-500">({raw.length} bytes)</span>}
        </span>
    );
}

function FullContent({
    hexString,
    copyText,
    className,
    inverted,
    align,
    spanSize,
    rowSize,
    isCopyable,
    wrap,
}: {
    hexString: string;
    copyText: string | null;
    className?: string;
    inverted: boolean;
    align: 'start' | 'end';
    spanSize: number;
    rowSize: number;
    isCopyable: boolean;
    wrap: boolean;
}) {
    const spans = formatHexSpans(splitHexPairs(hexString), { inverted }, spanSize);
    const rows = groupHexRows(spans, rowSize, spanSize);

    if (wrap) {
        return (
            <WrapContent
                spans={spans}
                className={className}
                copyText={copyText}
                inverted={inverted}
                isCopyable={isCopyable}
            />
        );
    }

    const divs = rows.map((row, rowIdx) => (
        <div key={rowIdx}>
            {row.map((span, spanIdx) => (
                <span key={spanIdx} className={hexSpanVariants({ tone: span.variant })}>
                    {span.text}&emsp;
                </span>
            ))}
        </div>
    ));

    const pre = <pre className="mb-0 inline-block bg-heavy-metal-900 p-1.5 text-left text-xs">{divs}</pre>;

    return (
        <div className={cn('flex', fullContentVariants({ align }), className)}>
            {isCopyable ? <Copyable text={copyText}>{pre}</Copyable> : pre}
        </div>
    );
}
