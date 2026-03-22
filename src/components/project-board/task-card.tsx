import { getTaskStatusLabel, getTaskStatusTone, type SubtaskProgress } from "./model";
import { statusTextVariants } from "./shared";
import type { DexTask } from "@/lib/tasks-service";

type TaskCardProps = {
  task: DexTask;
  onOpen: () => void;
  subtaskProgress?: SubtaskProgress;
};

export function TaskCard({ task, onOpen, subtaskProgress }: TaskCardProps) {
  return (
    <button
      className="block w-full rounded-lg border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:border-foreground/15 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className={statusTextVariants({ tone: getTaskStatusTone(task) })}>
              {getTaskStatusLabel(task)}
            </span>
            {task.priority !== null ? (
              <span className="text-muted-foreground">P{task.priority}</span>
            ) : null}
            {subtaskProgress ? (
              <span className="text-muted-foreground">
                {subtaskProgress.completed}/{subtaskProgress.total} subtasks
              </span>
            ) : null}
          </div>
          <h4 className="mt-1 min-w-0 text-sm font-semibold leading-snug text-foreground">
            {task.name}
          </h4>
        </div>
      </div>

      {task.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}
    </button>
  );
}
