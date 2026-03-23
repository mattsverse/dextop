import { FolderSearch } from "lucide-react";

type ProjectBoardPlaceholderProps = {
  isProjectsInitialized: boolean;
};

export function ProjectBoardPlaceholder({ isProjectsInitialized }: ProjectBoardPlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <section className="w-full max-w-2xl px-8 py-10 text-left sm:px-12 sm:py-12">
        <FolderSearch className="size-7 text-muted-foreground" />
        {isProjectsInitialized ? (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Open a project
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Choose a repo from the sidebar to load its dex tasks into this pane.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Open another pane when you want to compare projects side by side.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Loading projects
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Loading your saved repos and dex watchers.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
