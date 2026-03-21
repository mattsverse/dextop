import type { DexTask } from "@/lib/tasks-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTaskDate, getTaskStatusLabel, getTaskStatusTone } from "./model";
import { SectionCard, StatTile, statusBadgeVariants } from "./shared";

type TaskDetailsDialogProps = {
  open: boolean;
  selectedTask: DexTask | null;
  selectedTaskParent: DexTask | null;
  selectedTaskSubtasks: DexTask[];
  onOpenChange: (open: boolean) => void;
  onOpenTask: (taskId: string) => void;
};

export function TaskDetailsDialog({
  open,
  selectedTask,
  selectedTaskParent,
  selectedTaskSubtasks,
  onOpenChange,
  onOpenTask,
}: TaskDetailsDialogProps) {
  const detailsTone = selectedTask ? getTaskStatusTone(selectedTask) : "neutral";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="!flex !max-h-[82vh] !min-h-0 !w-[min(92vw,46rem)] !max-w-[46rem] !flex-col !overflow-hidden !rounded-[1.35rem] !border !border-border/80 !bg-panel !p-0 !text-foreground shadow-[0_28px_84px_rgba(15,23,42,0.18)] dark:shadow-[0_28px_84px_rgba(2,6,23,0.46)]">
        <DialogHeader className="gap-3 border-b border-border/75 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">Task details</p>
            {selectedTask ? (
              <span className={statusBadgeVariants({ tone: detailsTone })}>
                {getTaskStatusLabel(selectedTask)}
              </span>
            ) : null}
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            {selectedTask?.name ?? "Unknown task"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review the details without leaving the board.
          </DialogDescription>
        </DialogHeader>

        {selectedTask ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Status"
                tone={detailsTone}
                value={getTaskStatusLabel(selectedTask)}
              />
              <StatTile
                label="Priority"
                value={selectedTask.priority === null ? "Unset" : `P${selectedTask.priority}`}
              />
              <StatTile label="Task ID" value={selectedTask.id} />
            </div>

            <SectionCard
              description="Use this to understand the task before looking at relationships."
              eyebrow="Description"
              title="Task context"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selectedTask.description ?? "No description yet."}
              </p>
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard
                description="Open parent and child tasks directly from here."
                eyebrow="Structure"
                title="Relationships"
              >
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Parent
                    </p>
                    <div className="mt-2">
                      {selectedTask.parentId ? (
                        selectedTaskParent ? (
                          <button
                            className="rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                            onClick={() => onOpenTask(selectedTaskParent.id)}
                            type="button"
                          >
                            {selectedTaskParent.name}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {selectedTask.parentId}
                          </span>
                        )
                      ) : (
                        <p className="text-muted-foreground">This task has no parent.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Subtasks
                    </p>
                    {selectedTaskSubtasks.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedTaskSubtasks.map((subtask) => (
                          <button
                            key={subtask.id}
                            className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                            onClick={() => onOpenTask(subtask.id)}
                            type="button"
                          >
                            {subtask.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-muted-foreground">No subtasks yet.</p>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                description="Use blockers to understand what is holding work up."
                eyebrow="Dependencies"
                title="Blockers"
              >
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Blocked By
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTask.blockedBy.length > 0 ? (
                        selectedTask.blockedBy.map((taskId) => (
                          <span
                            key={taskId}
                            className="rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground"
                          >
                            {taskId}
                          </span>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Nothing is blocking this task.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Blocks
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTask.blocks.length > 0 ? (
                        selectedTask.blocks.map((taskId) => (
                          <span
                            key={taskId}
                            className="rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground"
                          >
                            {taskId}
                          </span>
                        ))
                      ) : (
                        <p className="text-muted-foreground">This task is not blocking anything.</p>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              description="Use these timestamps to see when the task moved or changed."
              eyebrow="Timeline"
              title="Timeline"
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Started", formatTaskDate(selectedTask.startedAt)],
                  ["Completed", formatTaskDate(selectedTask.completedAt)],
                  ["Created", formatTaskDate(selectedTask.createdAt)],
                  ["Updated", formatTaskDate(selectedTask.updatedAt)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1rem] border border-border/75 bg-background/80 px-4 py-3"
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </div>
        ) : (
          <p className="m-6 rounded-[1rem] border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] px-4 py-3 text-sm text-[color:var(--status-warning-fg)]">
            This task is no longer available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
