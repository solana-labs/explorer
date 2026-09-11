import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSwipeToDismiss } from '../useSwipeToDismiss';

const scrollRef = { current: null } as React.RefObject<HTMLDivElement | null>;

// Minimal fake React.PointerEvent — only the fields the hook reads.
function pointerEvent(clientY: number, overrides: Record<string, unknown> = {}) {
    return {
        clientY,
        currentTarget: {
            hasPointerCapture: () => false,
            parentElement: { offsetHeight: 500 },
            releasePointerCapture: vi.fn(),
            setPointerCapture: vi.fn(),
        },
        pointerId: 1,
        ...overrides,
    } as unknown as React.PointerEvent<HTMLDivElement>;
}

describe('useSwipeToDismiss', () => {
    it('should start idle', () => {
        const { result } = renderHook(() => useSwipeToDismiss(scrollRef, true, vi.fn()));

        expect(result.current.dragY).toBe(0);
        expect(result.current.dragging).toBe(false);
        expect(result.current.closing).toBe(false);
    });

    it('should track a downward drag from the handle', () => {
        const { result } = renderHook(() => useSwipeToDismiss(scrollRef, true, vi.fn()));

        act(() => result.current.handleProps.onPointerDown(pointerEvent(0)));
        act(() => result.current.handleProps.onPointerMove(pointerEvent(50)));

        expect(result.current.dragY).toBe(50);
        expect(result.current.dragging).toBe(true);
    });

    it('should clamp upward drags to zero', () => {
        const { result } = renderHook(() => useSwipeToDismiss(scrollRef, true, vi.fn()));

        act(() => result.current.handleProps.onPointerDown(pointerEvent(100)));
        act(() => result.current.handleProps.onPointerMove(pointerEvent(40)));

        expect(result.current.dragY).toBe(0);
    });

    it('should reset drag state once the sheet closes', () => {
        const { result, rerender } = renderHook(({ open }) => useSwipeToDismiss(scrollRef, open, vi.fn()), {
            initialProps: { open: true },
        });

        act(() => result.current.handleProps.onPointerDown(pointerEvent(0)));
        act(() => result.current.handleProps.onPointerMove(pointerEvent(50)));
        rerender({ open: false });

        expect(result.current.dragY).toBe(0);
        expect(result.current.dragging).toBe(false);
    });

    it('should dismiss after the slide-out has played when dragged past the threshold', () => {
        vi.useFakeTimers();
        try {
            const onDismiss = vi.fn();
            const { result } = renderHook(() => useSwipeToDismiss(scrollRef, true, onDismiss));

            act(() => result.current.handleProps.onPointerDown(pointerEvent(0)));
            act(() => result.current.handleProps.onPointerMove(pointerEvent(120)));
            act(() => result.current.handleProps.onPointerUp(pointerEvent(120)));

            expect(result.current.closing).toBe(true);
            expect(onDismiss).not.toHaveBeenCalled();

            act(() => vi.runAllTimers());

            expect(onDismiss).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('should snap back without dismissing below the threshold', () => {
        const onDismiss = vi.fn();
        const { result } = renderHook(() => useSwipeToDismiss(scrollRef, true, onDismiss));

        act(() => result.current.handleProps.onPointerDown(pointerEvent(0)));
        act(() => result.current.handleProps.onPointerMove(pointerEvent(20)));
        act(() => result.current.handleProps.onPointerUp(pointerEvent(20)));

        expect(result.current.dragY).toBe(0);
        expect(result.current.closing).toBe(false);
        expect(onDismiss).not.toHaveBeenCalled();
    });
});
