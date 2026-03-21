import { FolderSearch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyProjectBoardProps = {
  projectName: string;
  onAddTask: () => void;
};

export function EmptyProjectBoard({ projectName, onAddTask }: EmptyProjectBoardProps) {
  return (
    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/75 p-8 text-center">
      <div className="max-w-lg">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted/60">
          <FolderSearch className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          No tasks yet in {projectName}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Add the first task to start tracking work in this project.
        </p>
        <Button className="mt-6 rounded-full px-5" onClick={onAddTask}>
          <Plus className="size-4" />
          <span>Add First Task</span>
        </Button>
      </div>
    </section>
  );
}
