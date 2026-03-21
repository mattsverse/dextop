import * as React from "react";
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

/**
 * Renders a configured `Group` that fills its container and switches to column layout when vertical.
 *
 * @param className - Additional class names to merge with the component's default layout classes
 * @param orientation - Layout orientation; when `"vertical"`, the group uses column layout
 * @returns The configured `Group` element with merged class names and forwarded props
 */
export function ResizablePanelGroup({ className, orientation, ...props }: GroupProps) {
  return (
    <Group
      className={cn(
        "flex h-full w-full",
        orientation === "vertical" && "flex-col",
        className,
      )}
      orientation={orientation}
      {...props}
    />
  );
}

export { Panel as ResizablePanel };

type ResizableHandleProps = React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
};

/**
 * Renders a styled separator used as a resizable handle.
 *
 * When `withHandle` is true, an inner handle indicator is rendered; all other props
 * are forwarded to the underlying `Separator` element.
 *
 * @param className - Additional class names to merge onto the separator's root element.
 * @param withHandle - Whether to render the inner handle indicator. Defaults to `false`.
 * @returns A React element representing the resizable separator handle.
 */
export function ResizableHandle({
  className,
  withHandle = false,
  ...props
}: ResizableHandleProps) {
  return (
    <Separator
      className={cn(
        "group relative flex shrink-0 items-center justify-center bg-border/70 transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-[orientation=vertical]:w-px aria-[orientation=vertical]:px-1 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:py-1",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="flex items-center justify-center rounded-full border border-border/80 bg-background px-1 py-0.5 shadow-sm transition-colors group-hover:bg-panel aria-[orientation=horizontal]:rotate-90">
          <div className="z-resizable-handle-icon" />
        </div>
      ) : null}
    </Separator>
  );
}
