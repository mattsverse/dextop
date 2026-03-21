import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

/**
 * Redirects the current route to /projects while preserving existing query parameters and setting `projectId` from the current route params.
 *
 * @returns A React element that navigates to `/projects`, merging the current search params with `projectId` set to the route's `projectId`; the navigation replaces the current history entry.
 */
function RouteComponent() {
  const params = Route.useParams();

  return (
    <Navigate
      replace
      search={(current) => ({
        ...current,
        projectId: params.projectId,
      })}
      to="/projects"
    />
  );
}
