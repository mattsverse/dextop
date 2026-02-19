import type { JSX } from "solid-js";
import { ProjectsProvider } from "@/contexts/projects-context";
import { TasksProvider } from "@/contexts/tasks-context";
import { ThemeProvider } from "@/contexts/theme-context";

export function AppProviders(props: { children: JSX.Element }) {
  return (
    <ThemeProvider>
      <ProjectsProvider>
        <TasksProvider>{props.children}</TasksProvider>
      </ProjectsProvider>
    </ThemeProvider>
  );
}
