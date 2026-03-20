import { useEffect, useMemo } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ProjectSidebar } from "@/components/project-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";

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

  const selectedProjectPath = useMemo(() => {
    if (!selectedProjectId) {
      return null;
    }

    return projects.find((project) => project.id === selectedProjectId)?.path ?? null;
  }, [projects, selectedProjectId]);

  useEffect(() => {
    void initializeProjectsStore().catch((error) => {
      console.error("Failed to initialize projects store", error);
    });
    void initializeTasksStore().catch((error) => {
      console.error("Failed to initialize tasks store", error);
    });

    return () => {
      disposeTasksStore();
      disposeProjectsStore();
    };
  }, [disposeProjectsStore, disposeTasksStore, initializeProjectsStore, initializeTasksStore]);

  useEffect(() => {
    void setActiveProjectPath(selectedProjectPath).catch((error) => {
      console.error("Failed to watch project tasks", error);
    });
  }, [selectedProjectPath, setActiveProjectPath]);

  return (
    <SidebarProvider className="h-full min-h-0" defaultOpen>
      <ProjectSidebar />
      <SidebarInset className="min-w-0 flex-1 overflow-y-auto border border-slate-200/80 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
          <SidebarTrigger className="border border-slate-300/70 bg-white/85 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Current Project
            </p>
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-100">
              {selectedProjectName}
            </p>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
