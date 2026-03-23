import { FolderSearch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyProjectBoardProps = {
  projectName: string;
  onAddTask: () => void;
};

export function EmptyProjectBoard({ projectName, onAddTask }: EmptyProjectBoardProps) {
  return (
    <section className="flex flex-1 items-center justify-center">
      <div className="max-w-lg text-center">
        <FolderSearch className="mx-auto size-6 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          No dex tasks in {projectName}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Create one here, or add it with dex in the repo. New tasks land in Todo.
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Todo · In Progress · Blocked · Done
        </p>
        <Button className="mt-6 rounded-full px-5" onClick={onAddTask}>
          <Plus className="size-4" />
          <span>Add task</span>
        </Button>
      </div>
    </section>
  );
}
