'use client';

import { Dialog, DialogOverlay, DialogPortal } from '@components/shared/ui/dialog';
import { cn } from '@components/shared/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

import { DrawerFooter } from './DrawerFooter';
import { DrawerHeader } from './DrawerHeader';
import { useEdgeFades } from './model/useEdgeFades';
import { useSwipeToDismiss } from './model/useSwipeToDismiss';

// The drawer sits above the legacy dashkit stacking contexts (the cluster sidebar is z-[1060] over a
// z-[1050] overlay), so it needs an inline z-index that beats them — a Tailwind `z-*` class would be
// left in place next to Radix's own z-50 and lose on stylesheet order. One constant, two layers.
const DRAWER_Z_INDEX = 1201;

export type DrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
} & Pick<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'aria-describedby' | 'aria-label'>;

export function Drawer({
    open,
    onOpenChange,
    header,
    footer,
    children,
    className,
    onEscapeKeyDown,
    ...props
}: DrawerProps) {
    const scrollRef = React.useRef<HTMLDivElement | null>(null);
    const surfaceRef = React.useRef<HTMLDivElement | null>(null);
    const { dragY, dragging, closing, handleProps, bodyProps } = useSwipeToDismiss(scrollRef, open, () =>
        onOpenChange(false),
    );
    const { contentRef, maskImage, onScroll } = useEdgeFades(scrollRef, open);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay style={{ zIndex: DRAWER_Z_INDEX }} />
                <DialogPrimitive.Content
                    ref={surfaceRef}
                    tabIndex={-1}
                    onOpenAutoFocus={e => {
                        // Radix would auto-focus the first interactive element, which on this sheet is
                        // buried in the scrollable body (a copy button / link) — focusing it scroll-jumps
                        // the body and can pop the mobile keyboard. Move focus to the sheet container
                        // instead so screen readers announce it and Tab still starts from the top.
                        e.preventDefault();
                        surfaceRef.current?.focus();
                    }}
                    onEscapeKeyDown={onEscapeKeyDown}
                    className={cn(
                        'fixed inset-x-0 bottom-0 top-auto flex max-h-[85vh] w-full max-w-none flex-col',
                        'rounded-b-none rounded-t-2xl border-0 border-t border-solid border-dark-border bg-dk-gray-800-dark',
                        'outline-none',
                        'data-[state=open]:animate-drawer-in',
                        // Suppress the out-keyframe during a swipe-close: the transform below slides the
                        // sheet out from its drag offset, so the keyframe (which restarts from the open
                        // position) would otherwise snap it back up first.
                        !closing && 'data-[state=closed]:animate-drawer-out',
                        className,
                    )}
                    style={{
                        transform: `translateY(${dragY}px)`,
                        transition: dragging ? 'none' : 'transform 0.2s ease-out',
                        zIndex: DRAWER_Z_INDEX,
                    }}
                    {...props}
                >
                    <div className="shrink-0 cursor-grab pb-1 pt-1" style={{ touchAction: 'none' }} {...handleProps}>
                        <div className="mx-auto h-1 w-9 rounded-full bg-outer-space-700" />
                    </div>

                    {header !== undefined && <div className="shrink-0">{header}</div>}

                    <div
                        ref={scrollRef}
                        className="min-h-0 flex-1 overflow-y-auto"
                        style={{ WebkitMaskImage: maskImage, maskImage, overscrollBehavior: 'contain' }}
                        onScroll={onScroll}
                        {...bodyProps}
                    >
                        <div ref={contentRef}>{children}</div>
                    </div>

                    {footer !== undefined && <div className="shrink-0">{footer}</div>}
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

Drawer.Footer = DrawerFooter;
Drawer.Header = DrawerHeader;
