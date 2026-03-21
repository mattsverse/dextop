import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProjectsWorkspace } from "@/components/projects-workspace";
import { useTasks } from "@/contexts/tasks-context";

type ProjectsSearch = {
  projectId?: string;
  workspace?: string;
};

export const Route = createFileRoute("/projects")({
  validateSearch: (search: Record<string, unknown>): ProjectsSearch => ({
    projectId:
      typeof search.projectId === "string" && search.projectId.trim()
        ? search.projectId
        : undefined,
    workspace:
      typeof search.workspace === "string" && search.workspace.trim()
        ? search.workspace
        : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate({ from: "/projects" });
  const search = Route.useSearch();
  const { disposeTasksStore, initializeTasksStore } = useTasks();
  const clearingProjectIdRef = useRef(false);

  useEffect(() => {
    void initializeTasksStore().catch((error) => {
      console.error("Failed to initialize tasks store", error);
    });

    return () => {
      disposeTasksStore();
    };
  }, [disposeTasksStore, initializeTasksStore]);

  useEffect(() => {
    if (!search.projectId) {
      clearingProjectIdRef.current = false;
      return;
    }

    if (clearingProjectIdRef.current) {
      return;
    }

    clearingProjectIdRef.current = true;
    navigate({
      replace: true,
      search: (current) => ({
        ...current,
        projectId: undefined,
      }),
      to: "/projects",
    });
  }, [navigate, search.projectId]);

  return (
    <ProjectsWorkspace
      initialProjectId={search.projectId ?? null}
      onWorkspaceStateChange={(serializedState) => {
        navigate({
          replace: true,
          search: (current) =>
            current.workspace === serializedState
              ? current
              : {
                  ...current,
                  workspace: serializedState,
                },
          to: "/projects",
        });
      }}
      routeWorkspaceState={search.workspace ?? null}
    />
  );
}
