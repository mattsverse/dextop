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
      className="border-sidebar-border/70 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.16),transparent_36%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.96))] text-sidebar-foreground backdrop-blur-xl dark:bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.2),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"
      variant="sidebar"
    >
      <SidebarHeader className="border-sidebar-border/70 border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 text-primary flex size-9 items-center justify-center rounded-sm ring-1 ring-white/10">
            <FolderKanban className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-sidebar-foreground">Projects</h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Opened projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <ContextMenu>
                    <ContextMenuTrigger className="block">
                      <SidebarMenuButton
                        className={`h-auto flex-col items-start gap-1 rounded-sm border px-2.5 py-2.5 text-sidebar-foreground transition-all hover:border-slate-300/80 hover:bg-slate-100/60 dark:hover:border-white/10 dark:hover:bg-white/5 ${
                          project.id === selectedProjectId
                            ? "border-sky-300/40 bg-sky-300/20 shadow-[0_0_0_1px_rgba(125,211,252,0.2)] dark:border-sky-300/30 dark:bg-sky-300/10 dark:shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
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
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-800 dark:text-white">
                            {project.name}
                          </span>
                          <span className="shrink-0 rounded-sm bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-sidebar-foreground/80">
                            {project.tasks}
                          </span>
                        </div>
                        <span className="w-full truncate font-mono text-[10px] text-sidebar-foreground/55">
                          {project.path}
                        </span>
                        <div className="text-[10px] uppercase tracking-[0.08em] text-sidebar-foreground/45">
                          Open tasks
                        </div>
                      </SidebarMenuButton>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52 rounded-sm border border-slate-300/80 bg-white/96 p-1.5 shadow-[0_20px_60px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
                      <ContextMenuItem
                        className="rounded-sm text-slate-700 dark:text-slate-100"
                        onSelect={() => {
                          void openProjectInSeparateWindow(project.id);
                        }}
                      >
                        <ExternalLink className="size-4" />
                        <span>Open in separate window</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator className="my-1" />
                      <ContextMenuItem
                        className="rounded-sm"
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

      <SidebarFooter className="border-sidebar-border/70 border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 justify-center rounded-sm border border-transparent text-sm font-medium"
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
