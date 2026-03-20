import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { TopNavbar } from "@/components/top-navbar";
import { UpdaterNotification } from "@/components/updater-notification";
import { AppProviders } from "@/contexts/app-providers";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppProviders>
      <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(6,182,212,0.18),transparent_30%),#f8fafc] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.25),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.15),transparent_30%),#020617]">
        <TopNavbar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <UpdaterNotification />
      <TanStackRouterDevtools />
    </AppProviders>
  );
}
