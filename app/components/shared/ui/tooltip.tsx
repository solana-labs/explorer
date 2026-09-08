// TODO(fsd): relocate this module to @shared or the appropriate feature/entity layer.
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

// Radix opens tooltips on hover/focus only, so on touch devices (which deliver neither) the tooltip is
// unreachable. This context lets the trigger drive the tooltip's controlled open state on tap: the first
// tap opens it and a second tap closes it, while hover and keyboard focus keep working unchanged on
// desktop. Consumers can still control the tooltip themselves via `open`/`onOpenChange`.
type TooltipContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    wasOpenOnPointerDown: React.RefObject<boolean>;
};
const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined);

function Tooltip({
    open: openProp,
    defaultOpen,
    onOpenChange,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : uncontrolledOpen;
    // Captured on pointer-down (before Radix runs its own dismiss-on-press) so the click handler can tell
    // an opening tap (was closed) from a dismissing tap (was already open).
    const wasOpenOnPointerDown = React.useRef(false);

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (!isControlled) setUncontrolledOpen(next);
            onOpenChange?.(next);
        },
        [isControlled, onOpenChange],
    );

    return (
        <TooltipProvider>
            <TooltipContext.Provider value={{ open, setOpen, wasOpenOnPointerDown }}>
                <TooltipPrimitive.Root data-slot="tooltip" open={open} onOpenChange={setOpen} {...props} />
            </TooltipContext.Provider>
        </TooltipProvider>
    );
}

const TooltipTrigger = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onPointerDown, onClick, ...props }, ref) => {
    const ctx = React.useContext(TooltipContext);

    return (
        <TooltipPrimitive.Trigger
            ref={ref}
            data-slot="tooltip-trigger"
            {...props}
            onPointerDown={event => {
                if (ctx) ctx.wasOpenOnPointerDown.current = ctx.open;
                onPointerDown?.(event);
            }}
            onClick={event => {
                onClick?.(event);
                // Radix's own press handling already closes an open tooltip; we only need to force it open
                // on a tap that found it closed (i.e. a touch tap, which never triggered a hover open).
                if (ctx && !ctx.wasOpenOnPointerDown.current) ctx.setOpen(true);
            }}
        />
    );
});
TooltipTrigger.displayName = 'TooltipTrigger';

function TooltipContent({
    className,
    sideOffset = 0,
    children,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                className={cn(
                    'origin-(--radix-tooltip-content-transform-origin) z-50 w-fit text-balance rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-neutral-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                    className,
                )}
                {...props}
            >
                {children}
                <TooltipPrimitive.Arrow className="fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-0 rounded-[2px] fill-transparent" />
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
