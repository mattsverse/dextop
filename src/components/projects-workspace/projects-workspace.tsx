import { useEffect, useMemo } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Columns2, Rows2, SquareDashed, X } from "lucide-react";
import { ProjectBoardPlaceholder, ProjectBoardView } from "@/components/project-board";
import { ProjectSidebar } from "@/components/project-sidebar";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";
import { cn } from "@/lib/utils";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";
import { type WorkspaceNode } from "./workspace-state";

type ProjectsWorkspaceProps = {
  initialProjectId: string | null;
  routeWorkspaceState: string | null;
  onWorkspaceStateChange: (serializedState: string) => void;
};

type WorkspaceNodeViewProps = {
  node: WorkspaceNode;
  paneCount: number;
};

function getPaneCountLabel(count: number): string {
  return count === 1 ? "1 pane open" : `${count} panes open`;
}

function WorkspacePanePlaceholder() {
  const { projects } = useProjects();

  return (
    <div className="flex h-full items-center justify-center px-6 py-8">
      <section className="max-w-sm space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-dashed border-border/80 bg-panel/70 text-muted-foreground">
          <SquareDashed className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Empty pane</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {projects.length > 0
              ? "Pick a project from the sidebar to load it in this pane."
              : "Add a project first, then assign it to this pane from the sidebar."}
          </p>
        </div>
      </section>
    </div>
  );
}

function WorkspaceNodeView({ node, paneCount }: WorkspaceNodeViewProps) {
  const { projects } = useProjects();
  const { getProjectTasks } = useTasks();
  const {
    closePane,
    focusPane,
    focusedPaneId,
    splitPane,
    updateSplitLayout,
  } = useWorkspace();

  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  if (node.kind === "split") {
    const [firstChild, secondChild] = node.children;

    return (
      <ResizablePanelGroup
        className="h-full"
        id={node.id}
        onLayoutChanged={(layout) => {
          updateSplitLayout(node.id, [
            layout[firstChild.id] ?? node.sizes[0],
            layout[secondChild.id] ?? node.sizes[1],
          ]);
        }}
        orientation={node.axis}
      >
        <ResizablePanel
          className="min-h-0 min-w-0"
          defaultSize={`${node.sizes[0]}%`}
          id={firstChild.id}
          minSize="18%"
        >
          <WorkspaceNodeView node={firstChild} paneCount={paneCount} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          className="min-h-0 min-w-0"
          defaultSize={`${node.sizes[1]}%`}
          id={secondChild.id}
          minSize="18%"
        >
          <WorkspaceNodeView node={secondChild} paneCount={paneCount} />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  const project = node.projectId ? projectsById.get(node.projectId) ?? null : null;
  const projectTasks = getProjectTasks(project?.path ?? null);
  const isFocused = focusedPaneId === node.id;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-border/80 bg-background/88 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-shadow",
        isFocused && "border-primary/50 shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_20px_68px_rgba(15,23,42,0.12)]",
      )}
      data-focused={isFocused}
      onMouseDownCapture={() => {
        focusPane(node.id);
      }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/75 bg-panel/72 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {project?.name ?? "No project selected"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Pane {node.id.replace("pane-", "")} • {getPaneCountLabel(paneCount)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            aria-label="Split pane vertically"
            onClick={() => {
              splitPane(node.id, "horizontal");
            }}
            size="icon-xs"
            title="Split vertically (Mod+Alt+V)"
            variant="ghost"
          >
            <Columns2 />
          </Button>
          <Button
            aria-label="Split pane horizontally"
            onClick={() => {
              splitPane(node.id, "vertical");
            }}
            size="icon-xs"
            title="Split horizontally (Mod+Alt+H)"
            variant="ghost"
          >
            <Rows2 />
          </Button>
          <Button
            aria-label="Close pane"
            disabled={paneCount <= 1}
            onClick={() => {
              closePane(node.id);
            }}
            size="icon-xs"
            title="Close pane (Mod+Alt+W)"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {project ? <ProjectBoardView project={project} projectTasks={projectTasks} /> : <WorkspacePanePlaceholder />}
      </div>
    </section>
  );
}

function ProjectsWorkspaceShell() {
  const { projects, selectProject } = useProjects();
  const {
    assignProjectToFocusedPane,
    focusedProjectId,
    isWorkspaceReady,
    moveFocus,
    panes,
    splitFocusedPane,
    workspaceState,
    closeFocusedPane,
  } = useWorkspace();

  const focusedProject = useMemo(
    () => projects.find((project) => project.id === focusedProjectId) ?? null,
    [focusedProjectId, projects],
  );

  useEffect(() => {
    selectProject(focusedProjectId);
  }, [focusedProjectId, selectProject]);

  useHotkey(
    "Mod+Alt+V",
    () => {
      splitFocusedPane("horizontal");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Alt+H",
    () => {
      splitFocusedPane("vertical");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Alt+W",
    () => {
      closeFocusedPane();
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Alt+ArrowLeft",
    () => {
      moveFocus("left");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Alt+ArrowRight",
    () => {
      moveFocus("right");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Alt+ArrowUp",
    () => {
      moveFocus("up");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Alt+ArrowDown",
    () => {
      moveFocus("down");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  if (!isWorkspaceReady) {
    return <ProjectBoardPlaceholder isProjectsInitialized={false} />;
  }

  return (
    <SidebarProvider className="h-full min-h-0" defaultOpen>
      <ProjectSidebar
        onSelectProject={(projectId) => {
          assignProjectToFocusedPane(projectId);
        }}
        selectedProjectId={focusedProjectId}
      />
      <SidebarInset className="min-w-0 flex-1 overflow-y-auto border border-border/70 bg-background/70 backdrop-blur">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/75 bg-background/82 px-4 backdrop-blur-xl">
          <SidebarTrigger className="rounded-full border border-border/75 bg-panel text-muted-foreground hover:bg-background hover:text-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {focusedProject?.name ?? "Focused pane is empty"}
            </p>
          </div>
          <div className="ml-auto hidden text-right md:block">
            <p className="text-[11px] font-medium text-foreground">{getPaneCountLabel(panes.length)}</p>
            <p className="text-[11px] text-muted-foreground">
              Sidebar targets the focused pane
            </p>
          </div>
        </header>

        <section className="h-[calc(100%-56px)] overflow-hidden p-4 sm:p-5">
          <div className="h-full">
            <WorkspaceNodeView node={workspaceState.root} paneCount={panes.length} />
          </div>
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function ProjectsWorkspace({
  initialProjectId,
  routeWorkspaceState,
  onWorkspaceStateChange,
}: ProjectsWorkspaceProps) {
  const { isProjectsInitialized, projects } = useProjects();
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);

  if (!isProjectsInitialized) {
    return <ProjectBoardPlaceholder isProjectsInitialized={false} />;
  }

  return (
    <WorkspaceProvider
      initialProjectId={initialProjectId}
      onWorkspaceStateChange={onWorkspaceStateChange}
      projectIds={projectIds}
      routeWorkspaceState={routeWorkspaceState}
    >
      <ProjectsWorkspaceShell />
    </WorkspaceProvider>
  );
}
