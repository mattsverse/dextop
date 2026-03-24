import { FolderKanban, Plus } from "lucide-react";
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
import { ProjectListItem } from "./project-list-item";

type ProjectSidebarProps = {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
};

export function ProjectSidebar({ selectedProjectId, onSelectProject }: ProjectSidebarProps) {
  const { deleteProject, openProject, openProjectInSeparateWindow, projects } = useProjects();

  return (
    <Sidebar
      className="border-sidebar-border/80 bg-sidebar text-sidebar-foreground"
      variant="sidebar"
    >
      <SidebarHeader className="border-sidebar-border/80 border-b px-4 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-sidebar-foreground/70" />
            <h1 className="text-base font-semibold tracking-[-0.02em] text-sidebar-foreground">
              Projects
            </h1>
          </div>
          <p className="text-xs text-sidebar-foreground/60">
            Add a project to browse its dex tasks.
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            {projects.length === 0 ? (
              <div className="border border-dashed border-sidebar-border px-3 py-4 text-sm text-sidebar-foreground/60">
                No projects yet. Add one to get started.
              </div>
            ) : null}
            <SidebarMenu className="gap-1">
              {projects.map((project) => (
                <ProjectListItem
                  isSelected={project.id === selectedProjectId}
                  key={project.id}
                  onDelete={() => {
                    void deleteProject(project.id);
                  }}
                  onOpenInSeparateWindow={() => {
                    void openProjectInSeparateWindow(project.id);
                  }}
                  onSelect={() => {
                    onSelectProject(project.id);
                  }}
                  project={project}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border/80 border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-9 justify-center border border-transparent bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/92"
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
