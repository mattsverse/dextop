import { getTaskStatusLabel, getTaskStatusTone, type SubtaskProgress } from "./model";
import { cn } from "@/lib/utils";
import { statusBadgeVariants } from "./shared";
import type { DexTask } from "@/lib/tasks-service";

type TaskCardProps = {
  task: DexTask;
  onOpen: () => void;
  subtaskProgress?: SubtaskProgress;
};

export function TaskCard({ task, onOpen, subtaskProgress }: TaskCardProps) {
  const metadata = [
    task.priority !== null ? `P${task.priority}` : null,
    subtaskProgress ? `${subtaskProgress.completed}/${subtaskProgress.total} subtasks` : null,
  ].filter(Boolean);

  return (
    <button
      className={cn(
        "block w-full border border-border bg-background px-4 py-3 text-left transition-[border-color,background-color] hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
      )}
      onClick={onOpen}
      type="button"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusBadgeVariants({ tone: getTaskStatusTone(task) })}>
            {getTaskStatusLabel(task)}
          </span>
          {metadata.length > 0 ? <span className="text-xs text-muted-foreground">{metadata.join(" · ")}</span> : null}
        </div>
        <h4 className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground">
          {task.name}
        </h4>

        {task.description ? (
          <p className="line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
            {task.description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
