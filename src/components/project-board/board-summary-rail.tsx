import { cva } from "class-variance-authority";
import type { TaskFilterKey } from "./model";
import { StatTile } from "./shared";

const filterButtonVariants = cva("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", {
  variants: {
    active: {
      true: "bg-foreground text-background",
      false: "text-muted-foreground hover:bg-muted hover:text-foreground",
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
};

const FILTERS: Array<{ key: TaskFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "blocked", label: "Blocked" },
  { key: "inProgress", label: "In Progress" },
  { key: "highPriority", label: "High Priority" },
];

export function BoardSummaryRail({
  totalTasks,
  openTasks,
  blockedTasks,
  doneTasks,
  activeFilter,
  onFilterChange,
}: BoardSummaryRailProps) {
  return (
    <section className="flex flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            className={filterButtonVariants({ active: filter.key === activeFilter })}
            onClick={() => onFilterChange(filter.key)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <StatTile label="Open" tone="active" value={String(openTasks)} />
        <StatTile label="Blocked" tone="warning" value={String(blockedTasks)} />
        <StatTile label="Done" tone="success" value={String(doneTasks)} />
        <StatTile label="Total" tone="neutral" value={String(totalTasks)} />
      </div>
    </section>
  );
}
