import { cva } from "class-variance-authority";

export const updateNoticeVariants = cva(
  "fixed right-4 bottom-4 z-50 w-[min(92vw,24rem)] border p-3",
  {
    variants: {
      variant: {
        info: "border-[color:var(--status-active-border)] bg-[color:var(--status-active-bg)] text-[color:var(--status-active-fg)]",
        error: "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

export const updateInlineStatusVariants = cva("border px-2.5 py-2 text-sm", {
  variants: {
    tone: {
      active:
        "border-[color:var(--status-active-border)] bg-[color:var(--status-active-bg)] text-[color:var(--status-active-fg)]",
      warning:
        "border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-fg)]",
    },
  },
  defaultVariants: {
    tone: "active",
  },
});
