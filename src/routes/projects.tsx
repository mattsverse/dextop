import { useEffect } from "react";
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

/**
 * Route component for "/projects" that renders the ProjectsWorkspace and synchronizes route search state.
 *
 * Initializes the tasks store on mount and disposes it on unmount. If a `projectId` is present in the validated
 * route search, the component clears it from the URL (using a replace navigation). When the workspace state changes
 * via `onWorkspaceStateChange`, the component updates the `workspace` search parameter (using replace) while preserving
 * other search fields.
 *
 * @returns The rendered element for the `/projects` route.
 */
function RouteComponent() {
  const navigate = useNavigate({ from: "/projects" });
  const search = Route.useSearch();
  const { disposeTasksStore, initializeTasksStore } = useTasks();

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
      return;
    }

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
