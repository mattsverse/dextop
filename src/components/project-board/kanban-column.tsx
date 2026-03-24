import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DexTask } from "@/lib/tasks-service";
import { KANBAN_COLUMNS, type SubtaskProgress } from "./model";
import { statusBadgeVariants } from "./shared";
import { TaskCard } from "./task-card";

const COLUMN_TONES = {
  todo: "neutral",
  inProgress: "active",
  blocked: "warning",
  done: "success",
} as const;

type KanbanColumnProps = {
  column: (typeof KANBAN_COLUMNS)[number];
  tasks: DexTask[];
  isCollapsed: boolean;
  compact?: boolean;
  onToggleCollapsed: () => void;
  onOpenTask: (taskId: string) => void;
  getSubtaskProgress: (taskId: string) => SubtaskProgress | undefined;
};

export function KanbanColumn({
  column,
  tasks,
  isCollapsed,
  compact = false,
  onToggleCollapsed,
  onOpenTask,
  getSubtaskProgress,
}: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <section
      className={cn(
        "group flex min-h-0 flex-col",
        compact && "snap-start border border-border bg-background px-3 py-3",
        !compact && "border-r border-border pr-3 last:border-r-0",
        isCollapsed
          ? compact
            ? "w-[104px] shrink-0"
            : "w-[92px] shrink-0"
          : compact
            ? "w-[16rem] shrink-0"
            : "min-w-[16rem] flex-1 basis-0",
      )}
    >
      <header className={cn("flex items-center justify-between gap-3", compact ? "" : "pb-3")}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {!isCollapsed ? (
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-base font-semibold text-foreground">{column.label}</p>
              <span className={statusBadgeVariants({ tone: COLUMN_TONES[column.key] })}>
                {tasks.length}
              </span>
            </div>
          ) : null}
        </div>

        <Button
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${column.label} column`}
          className={cn(
            "size-9 text-muted-foreground",
            !compact && "opacity-40 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onClick={onToggleCollapsed}
          type="button"
          size="icon-lg"
          variant="ghost"
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </header>

      {isCollapsed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-3 py-6 text-center">
          <Icon className="size-5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground">{column.compactLabel}</p>
          <span className={statusBadgeVariants({ tone: COLUMN_TONES[column.key] })}>
            {tasks.length}
          </span>
        </div>
      ) : (
        <div className={cn("flex-1 overflow-y-auto", compact ? "pt-3" : "pt-1")}>
          {tasks.length > 0 ? (
            <div className="grid content-start gap-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  onOpen={() => onOpenTask(task.id)}
                  subtaskProgress={getSubtaskProgress(task.id)}
                  task={task}
                />
              ))}
            </div>
          ) : (
            <div className={cn("py-6", compact ? "text-center" : "text-left")}>
              <p className="text-sm font-medium text-foreground">No tasks</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tasks appear here as work moves through the board.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
