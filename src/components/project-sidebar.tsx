import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, FolderKanban, Plus, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/projects-context";

export function ProjectSidebar() {
  const navigate = useNavigate();
  const { deleteProject, openProject, openProjectInSeparateWindow, projects, selectedProjectId } =
    useProjects();

  return (
    <Sidebar
      className="border-sidebar-border/80 bg-sidebar text-sidebar-foreground backdrop-blur-xl"
      variant="sidebar"
    >
      <SidebarHeader className="border-sidebar-border/80 border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-sidebar-border/80 bg-background/80 text-primary">
            <FolderKanban className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/55">
              Workspace
            </p>
            <h1 className="text-base font-semibold tracking-[-0.02em] text-sidebar-foreground">
              Projects
            </h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Active list
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <ContextMenu>
                    <ContextMenuTrigger className="block">
                      <SidebarMenuButton
                        className={`h-auto flex-col items-start gap-1.5 rounded-[1.05rem] border px-3 py-3 text-sidebar-foreground transition-all hover:border-sidebar-border hover:bg-background/70 ${
                          project.id === selectedProjectId
                            ? "border-primary/35 bg-primary/12 text-sidebar-foreground shadow-[0_16px_35px_rgba(15,23,42,0.1)] ring-1 ring-primary/18"
                            : "border-transparent"
                        }`}
                        isActive={project.id === selectedProjectId}
                        onClick={() => {
                          navigate({
                            to: "/projects/$projectId",
                            params: { projectId: project.id },
                          });
                        }}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                              {project.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-sidebar-foreground/58">
                              {project.path.split("/").slice(-3).join("/")}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              project.id === selectedProjectId
                                ? "border-primary/30 bg-primary/18 text-sidebar-foreground"
                                : "border-sidebar-border/80 bg-background/85 text-sidebar-foreground/72"
                            }`}
                          >
                            {project.tasks}
                          </span>
                        </div>
                        <span
                          className={`w-full truncate font-mono text-[10px] ${
                            project.id === selectedProjectId
                              ? "text-sidebar-foreground/68"
                              : "text-sidebar-foreground/42"
                          }`}
                        >
                          {project.path}
                        </span>
                        <div
                          className={`text-[10px] uppercase tracking-[0.16em] ${
                            project.id === selectedProjectId
                              ? "text-sidebar-foreground/70"
                              : "text-sidebar-foreground/40"
                          }`}
                        >
                          {project.id === selectedProjectId ? "Current project" : "Open task count"}
                        </div>
                      </SidebarMenuButton>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52 rounded-xl border border-border/80 bg-popover/96 p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                      <ContextMenuItem
                        className="rounded-lg text-foreground"
                        onSelect={() => {
                          void openProjectInSeparateWindow(project.id);
                        }}
                      >
                        <ExternalLink className="size-4" />
                        <span>Open in separate window</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator className="my-1" />
                      <ContextMenuItem
                        className="rounded-lg"
                        onSelect={() => {
                          void deleteProject(project.id);
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="size-4" />
                        <span>Delete project</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border/80 border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-11 justify-center rounded-full border border-transparent bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/92"
              onClick={() => {
                void openProject();
              }}
            >
              <Plus className="size-4" />
              <span>Open Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
