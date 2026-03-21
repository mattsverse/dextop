import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";
import { CommandPalette } from "@/components/command-palette";
import { TopNavbar } from "@/components/top-navbar";
import { Toaster } from "@/components/ui/sonner";
import { UpdaterNotification } from "@/components/updater-notification";
import { AppProviders } from "@/contexts/app-providers";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <AppProviders>
        <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
          <TopNavbar />
          <main className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
        <Toaster />
        <UpdaterNotification />
      </AppProviders>
      <TanStackDevtools
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
          formDevtoolsPlugin(),
          hotkeysDevtoolsPlugin(),
        ]}
      />
    </>
  );
}
