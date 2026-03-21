import type { ReactNode } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { StatusTone } from "./model";

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

export const statusTextVariants = cva("font-medium", {
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
};

export function StatTile({ label, value, tone = "neutral" }: StatTileProps) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={statValueVariants({ tone })}>{value}</p>
    </div>
  );
}

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  headerClassName?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  headerClassName,
}: SectionCardProps) {
  return (
    <section className="space-y-3">
      <div className={cn("space-y-1", headerClassName)}>
        <p className="text-[11px] font-medium text-muted-foreground">{eyebrow}</p>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
