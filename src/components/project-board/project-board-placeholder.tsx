import { FolderSearch } from "lucide-react";

type ProjectBoardPlaceholderProps = {
  isProjectsInitialized: boolean;
};

export function ProjectBoardPlaceholder({ isProjectsInitialized }: ProjectBoardPlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <section className="w-full max-w-2xl px-8 py-10 text-center sm:px-12 sm:py-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted/60">
          <FolderSearch className="size-7 text-muted-foreground" />
        </div>
        {isProjectsInitialized ? (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Choose a project
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pick one from the sidebar to scan its tasks at a glance and open details when you need
              more context.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Loading projects
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Loading your saved projects and dex watchers.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
