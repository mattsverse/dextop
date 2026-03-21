import { KanbanSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatShortPath } from "./model";

type ProjectBoardHeaderProps = {
  projectName: string;
  projectPath: string;
  totalTasks: number;
  openTasks: number;
  onAddTask: () => void;
};

export function ProjectBoardHeader({
  projectName,
  projectPath,
  totalTasks,
  openTasks,
  onAddTask,
}: ProjectBoardHeaderProps) {
  return (
    <section className="border-b border-border/70 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <KanbanSquare className="size-3.5" />
            <span>Board</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
              {projectName}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{formatShortPath(projectPath)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{openTasks} open</span>
            <span>{totalTasks} total</span>
          </div>
        </div>

        <Button className="h-10 rounded-full px-5" onClick={onAddTask}>
          <Plus className="size-4" />
          <span>Add Task</span>
        </Button>
      </div>
    </section>
  );
}
