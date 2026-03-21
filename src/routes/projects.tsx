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
      <SidebarInset className="min-w-0 flex-1 overflow-y-auto border border-border/70 bg-background/70 backdrop-blur">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/75 bg-background/82 px-4 backdrop-blur-xl">
          <SidebarTrigger className="rounded-full border border-border/75 bg-panel text-muted-foreground hover:bg-background hover:text-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Project</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {selectedProjectName ?? "Choose a project"}
            </p>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
