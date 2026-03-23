import type { ReactNode } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { StatusTone } from "./model";

export const boardPanelSurfaceClass =
  "rounded-[1.5rem] border border-border/75 bg-panel/88 shadow-[0_22px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]";

export const boardDialogSurfaceClass =
  "rounded-[1.5rem] border border-border/75 bg-panel/96 shadow-[0_28px_84px_rgba(15,23,42,0.18)] dark:shadow-[0_28px_84px_rgba(2,6,23,0.46)]";

export const boardSurfaceVariants = cva(
  "relative overflow-hidden",
  {
    variants: {
      tone: {
        default: boardPanelSurfaceClass,
        subtle: "rounded-[1rem] border border-border/70 bg-background/58 shadow-none dark:bg-background/24",
        dashed: "rounded-[1rem] border border-border/65 border-dashed bg-background/34 shadow-none",
      },
      interactive: {
        true:
          "transition-[border-color,background-color] hover:border-primary/18 hover:bg-background/76",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      interactive: false,
    },
  },
);

export const statusBadgeVariants = cva(
  "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
  {
    variants: {
      tone: {
        neutral: "border-border/70 bg-muted/70 text-muted-foreground",
        active:
          "border-[color:var(--status-active-border)] bg-[color:var(--status-active-bg)] text-[color:var(--status-active-fg)]",
        warning:
          "border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-fg)]",
        success:
          "border-[color:var(--status-success-border)] bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export const metaPillVariants = cva(
  "inline-flex items-center gap-1 rounded-full border border-border/65 bg-background/72 px-2.5 py-1 text-xs font-medium text-muted-foreground",
  {
    variants: {
      tone: {
        default: "",
        active:
          "border-[color:var(--status-active-border)] bg-[color:var(--status-active-bg)] text-[color:var(--status-active-fg)]",
        warning:
          "border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-fg)]",
        success:
          "border-[color:var(--status-success-border)] bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)]",
      },
      mono: {
        true: "font-mono",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      mono: false,
    },
  },
);

export const interactivePillVariants = cva(
  "inline-flex items-center rounded-full border border-border/70 bg-background/78 px-3 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
);

const statValueVariants = cva("text-sm font-semibold tracking-tight", {
  variants: {
    tone: {
      neutral: "text-muted-foreground",
      active: "text-[color:var(--status-active-fg)]",
      warning: "text-[color:var(--status-warning-fg)]",
      success: "text-[color:var(--status-success-fg)]",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

type StatTileProps = {
  label: string;
  value: string;
  tone?: StatusTone;
  framed?: boolean;
  className?: string;
  valueClassName?: string;
};

export function StatTile({
  label,
  value,
  tone = "neutral",
  framed = false,
  className,
  valueClassName,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "space-y-1",
        framed &&
          "min-w-[5.75rem] rounded-[1rem] border border-border/70 bg-background/72 px-4 py-3",
        className,
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn(statValueVariants({ tone }), valueClassName)}>{value}</p>
    </div>
  );
}

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  headerClassName?: string;
  containerClassName?: string;
  contentClassName?: string;
  surface?: boolean;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  headerClassName,
  containerClassName,
  contentClassName,
  surface = false,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "space-y-3",
        surface && "rounded-[1.25rem] border border-border/70 bg-background/72 p-4 sm:p-5",
        containerClassName,
      )}
    >
      <div className={cn("space-y-1", headerClassName)}>
        <p className="text-[11px] font-medium text-muted-foreground">{eyebrow}</p>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
