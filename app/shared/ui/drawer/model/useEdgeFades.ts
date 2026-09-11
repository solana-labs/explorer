import React from 'react';

// Distance (px) over which each edge fade eases in/out.
const FADE_RAMP = 24;

/**
 * Background-agnostic edge fades on the scroll body: a mask-image dissolves the content to
 * transparent at whichever end still has hidden content, so it works on any sheet background. Each
 * end ramps over {@link FADE_RAMP}. Returns a callback ref for the content wrapper — attaching a
 * ResizeObserver there refreshes the bottom fade when body height changes (raw bytes / instruction
 * list resolving), which `onScroll` alone never catches.
 */
export function useEdgeFades(
    scrollRef: React.RefObject<HTMLDivElement | null>,
    open: boolean,
): { contentRef: (node: HTMLDivElement | null) => void; maskImage: string; onScroll: () => void } {
    const [topFade, setTopFade] = React.useState(0);
    const [bottomFade, setBottomFade] = React.useState(0);

    const updateFades = React.useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setTopFade(Math.min(1, el.scrollTop / FADE_RAMP));
        const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setBottomFade(Math.min(1, Math.max(0, fromBottom) / FADE_RAMP));
    }, [scrollRef]);

    // Callback ref rather than a mount effect: Radix mounts the sheet body only once it opens, so a
    // ref+effect keyed on mount would attach the observer while the node is still null and never
    // reattach. The callback fires whenever the node itself mounts/unmounts.
    const observer = React.useRef<ResizeObserver | null>(null);
    const contentRef = React.useCallback(
        (node: HTMLDivElement | null) => {
            observer.current?.disconnect();
            if (!node || typeof ResizeObserver === 'undefined') return;
            observer.current = new ResizeObserver(() => updateFades());
            observer.current.observe(node);
        },
        [updateFades],
    );

    React.useEffect(() => {
        updateFades();
    }, [open, updateFades]);

    const maskImage = `linear-gradient(to bottom, rgba(0,0,0,${1 - topFade}) 0, #000 ${FADE_RAMP}px, #000 calc(100% - ${FADE_RAMP}px), rgba(0,0,0,${1 - bottomFade}) 100%)`;

    return { contentRef, maskImage, onScroll: updateFades };
}
