import type { ReactNode } from "react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ProjectsProvider } from "@/contexts/projects-context";
import { TasksProvider } from "@/contexts/tasks-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { UpdaterProvider } from "@/contexts/updater-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <HotkeysProvider>
        <UpdaterProvider>
          <TooltipProvider>
            <ProjectsProvider>
              <TasksProvider>{children}</TasksProvider>
            </ProjectsProvider>
          </TooltipProvider>
        </UpdaterProvider>
      </HotkeysProvider>
    </ThemeProvider>
  );
}
