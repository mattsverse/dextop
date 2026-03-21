import { cva } from "class-variance-authority";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DexTask } from "@/lib/tasks-service";
import { KANBAN_COLUMNS, type SubtaskProgress } from "./model";
import { TaskCard } from "./task-card";

const kanbanColumnVariants = cva(
  "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background/40",
  {
    variants: {
      collapsed: {
        true: "w-[88px] shrink-0",
        false: "min-w-[292px] flex-1 basis-0",
      },
    },
  },
);

type KanbanColumnProps = {
  column: (typeof KANBAN_COLUMNS)[number];
  tasks: DexTask[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenTask: (taskId: string) => void;
  getSubtaskProgress: (taskId: string) => SubtaskProgress | undefined;
};

export function KanbanColumn({
  column,
  tasks,
  isCollapsed,
  onToggleCollapsed,
  onOpenTask,
  getSubtaskProgress,
}: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <section className={kanbanColumnVariants({ collapsed: isCollapsed })}>
      <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{column.label}</p>
              <p className="text-[11px] text-muted-foreground">{tasks.length}</p>
            </div>
          ) : null}
        </div>

        <button
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${column.label} column`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onToggleCollapsed}
          type="button"
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </header>

      {isCollapsed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-4 text-center">
          <Icon className="size-5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground">{column.compactLabel}</p>
          <p className="text-xs font-semibold text-foreground">{tasks.length}</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                onOpen={() => onOpenTask(task.id)}
                subtaskProgress={getSubtaskProgress(task.id)}
                task={task}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">Nothing here</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tasks move here as work changes.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
