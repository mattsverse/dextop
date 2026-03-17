import { For } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { ExternalLink, FolderKanban, Plus, Trash2 } from "lucide-solid";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useProjects } from "@/contexts/projects-context";
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

export function ProjectSidebar() {
  const navigate = useNavigate();
  const { deleteProject, openProject, openProjectInSeparateWindow, projects, selectedProjectId } =
    useProjects();

  return (
    <Sidebar
      class="border-sidebar-border/70 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.16),transparent_36%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.96))] text-sidebar-foreground backdrop-blur-xl dark:bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.2),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"
      variant="sidebar"
    >
      <SidebarHeader class="border-sidebar-border/70 border-b px-4 py-4">
        <div class="flex items-center gap-3">
          <div class="bg-primary/20 text-primary flex size-9 items-center justify-center rounded-sm ring-1 ring-white/10">
            <FolderKanban class="size-4" />
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-semibold text-sidebar-foreground">Projects</h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent class="px-3 py-3">
        <SidebarGroup class="p-0">
          <SidebarGroupLabel class="px-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Opened projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu class="gap-1.5">
              <For each={projects()}>
                {(project) => (
                  <SidebarMenuItem>
                    <ContextMenu>
                      <ContextMenuTrigger class="block">
                        <SidebarMenuButton
                          class={`h-auto flex-col items-start gap-1 rounded-sm border px-2.5 py-2.5 text-sidebar-foreground transition-all hover:border-slate-300/80 hover:bg-slate-100/60 dark:hover:border-white/10 dark:hover:bg-white/5 ${
                            project.id === selectedProjectId()
                              ? "border-sky-300/40 bg-sky-300/20 shadow-[0_0_0_1px_rgba(125,211,252,0.2)] dark:border-sky-300/30 dark:bg-sky-300/10 dark:shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
                              : "border-transparent"
                          }`}
                          isActive={project.id === selectedProjectId()}
                          onClick={() => {
                            navigate({
                              to: "/projects/$projectId",
                              params: { projectId: project.id },
                            });
                          }}
                        >
                          <div class="flex w-full items-center justify-between gap-2">
                            <span class="truncate text-sm font-medium text-slate-800 dark:text-white">
                              {project.name}
                            </span>
                            <span class="shrink-0 rounded-sm bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-sidebar-foreground/80">
                              {project.tasks}
                            </span>
                          </div>
                          <span class="w-full truncate font-mono text-[10px] text-sidebar-foreground/55">
                            {project.path}
                          </span>
                          <div class="text-[10px] uppercase tracking-[0.08em] text-sidebar-foreground/45">
                            Open tasks
                          </div>
                        </SidebarMenuButton>
                      </ContextMenuTrigger>
                      <ContextMenuContent class="w-52 rounded-sm border border-slate-300/80 bg-white/96 p-1.5 shadow-[0_20px_60px_rgba(148,163,184,0.28)] dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
                        <ContextMenuItem
                          class="rounded-sm text-slate-700 dark:text-slate-100"
                          onSelect={() => {
                            void openProjectInSeparateWindow(project.id);
                          }}
                        >
                          <ExternalLink class="size-4" />
                          <span>Open in separate window</span>
                        </ContextMenuItem>
                        <ContextMenuSeparator class="my-1" />
                        <ContextMenuItem
                          class="rounded-sm"
                          onSelect={() => {
                            void deleteProject(project.id);
                          }}
                          variant="destructive"
                        >
                          <Trash2 class="size-4" />
                          <span>Delete project</span>
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter class="border-sidebar-border/70 border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              class="bg-primary text-primary-foreground hover:bg-primary/90 h-10 justify-center rounded-sm border border-transparent text-sm font-medium"
              onClick={() => {
                void openProject();
              }}
            >
              <Plus class="size-4" />
              <span>Open Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
