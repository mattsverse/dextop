import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShortPath } from "./model";

type ProjectBoardHeaderProps = {
  projectName: string;
  projectPath: string;
  compact?: boolean;
  onAddTask: () => void;
};

export function ProjectBoardHeader({
  projectName,
  projectPath,
  compact = false,
  onAddTask,
}: ProjectBoardHeaderProps) {
  return (
    <section
      className={cn(
        "gap-3 border-b border-border/60 pb-3",
        compact ? "flex flex-col" : "flex flex-col sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Dex board
        </p>
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
          {projectName}
        </h1>
        <p className="truncate text-sm text-muted-foreground" title={projectPath}>
          {formatShortPath(projectPath)}
        </p>
      </div>

      <Button
        className={cn("min-h-11 rounded-full px-5", compact ? "w-full justify-center" : "sm:self-end")}
        onClick={onAddTask}
      >
        <Plus className="size-4" />
        <span>Add task</span>
      </Button>
    </section>
  );
}
