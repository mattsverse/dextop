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
      className="border-sidebar-border/80 bg-sidebar text-sidebar-foreground"
      variant="sidebar"
    >
      <SidebarHeader className="border-sidebar-border/80 border-b px-4 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-sidebar-foreground/70" />
            <h1 className="text-base font-semibold tracking-[-0.02em] text-sidebar-foreground">Projects</h1>
          </div>
          <p className="text-xs text-sidebar-foreground/60">Add a project to browse its dex tasks.</p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-sidebar-border/80 px-3 py-4 text-sm text-sidebar-foreground/60">
                No projects yet. Add one to get started.
              </div>
            ) : null}
            <SidebarMenu className="gap-1">
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <ContextMenu>
                    <ContextMenuTrigger className="block">
                      <SidebarMenuButton
                        className={`h-auto flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-sidebar-foreground transition-all hover:bg-background/60 ${
                          project.id === selectedProjectId
                            ? "border-sidebar-border bg-background/80"
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
                              {project.path.split("/").slice(-2).join("/")}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 text-[11px] font-medium ${
                              project.id === selectedProjectId
                                ? "text-sidebar-foreground"
                                : "text-sidebar-foreground/60"
                            }`}
                          >
                            {project.tasks}
                          </span>
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
              <span>Add Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
