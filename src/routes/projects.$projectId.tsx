import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

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
