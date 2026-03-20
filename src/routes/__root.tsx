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
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TopNavbar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <UpdaterNotification />
      <TanStackRouterDevtools position="bottom-right" />
    </AppProviders>
  );
}
