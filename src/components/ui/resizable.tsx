import * as React from "react";
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

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
