import { ProjectSidebar } from "@/components/project-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";
import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { createEffect, createMemo, onCleanup, onMount } from "solid-js";

export const Route = createFileRoute("/projects")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    disposeProjectsStore,
    initializeProjectsStore,
    projects,
    selectedProjectId,
    selectedProjectName,
  } = useProjects();
  const { disposeTasksStore, initializeTasksStore, setActiveProjectPath } = useTasks();

  const selectedProjectPath = createMemo(() => {
    const selectedId = selectedProjectId();
    if (!selectedId) {
      return null;
    }

    return projects().find((project) => project.id === selectedId)?.path ?? null;
  });

  onMount(() => {
    void initializeProjectsStore().catch((error) => {
      console.error("Failed to initialize projects store", error);
    });
    void initializeTasksStore().catch((error) => {
      console.error("Failed to initialize tasks store", error);
    });
  });

  createEffect(() => {
    const projectPath = selectedProjectPath();
    void setActiveProjectPath(projectPath).catch((error) => {
      console.error("Failed to watch project tasks", error);
    });
  });

  onCleanup(() => {
    disposeTasksStore();
    disposeProjectsStore();
  });
  return (
    <>
      <SidebarProvider class="h-full" defaultOpen>
        <ProjectSidebar />
        <SidebarInset class="min-w-0 flex-1 overflow-y-auto border border-slate-200/80 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
          <header class="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
            <SidebarTrigger class="border border-slate-300/70 bg-white/85 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10" />
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Current Project
              </p>
              <p class="truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                {selectedProjectName()}
              </p>
            </div>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
