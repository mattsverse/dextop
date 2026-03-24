import { cva } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskFilterKey } from "./model";

const filterButtonVariants = cva("border px-3 text-sm font-medium transition-colors", {
  variants: {
    active: {
      true: "border-border bg-panel text-foreground",
      false:
        "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    },
  },
});

type BoardSummaryRailProps = {
  totalTasks: number;
  openTasks: number;
  blockedTasks: number;
  doneTasks: number;
  activeFilter: TaskFilterKey;
  onFilterChange: (value: TaskFilterKey) => void;
  compact?: boolean;
};

const FILTERS: Array<{ key: TaskFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "blocked", label: "Blocked" },
  { key: "inProgress", label: "In Progress" },
  { key: "highPriority", label: "High priority" },
];

export function BoardSummaryRail({
  totalTasks,
  openTasks,
  blockedTasks,
  doneTasks,
  activeFilter,
  onFilterChange,
  compact = false,
}: BoardSummaryRailProps) {
  const summaryParts = [
    `${totalTasks} total`,
    `${openTasks} open`,
    `${blockedTasks} blocked`,
    `${doneTasks} done`,
  ];

  return (
    <section
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-3",
        compact ? "" : "lg:flex-row lg:items-center lg:justify-between",
      )}
    >
      <div aria-label="Filter tasks" className="flex flex-wrap gap-2" role="toolbar">
        {FILTERS.map((filter) => (
          <Button
            aria-pressed={filter.key === activeFilter}
            key={filter.key}
            className={cn(
              filterButtonVariants({ active: filter.key === activeFilter }),
              "h-9 px-4 text-sm",
            )}
            variant="ghost"
            onClick={() => onFilterChange(filter.key)}
            type="button"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{summaryParts.join(" · ")}</p>
    </section>
  );
}
