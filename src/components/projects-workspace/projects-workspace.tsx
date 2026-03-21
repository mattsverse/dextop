import { useEffect, useMemo } from "react";
import { useHotkeySequence } from "@tanstack/react-hotkeys";
import type { HotkeySequence } from "@tanstack/hotkeys";
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
import {
  CLOSE_PANE_LABEL,
  SPLIT_SIDE_BY_SIDE_LABEL,
  SPLIT_STACKED_LABEL,
  TMUX_PREFIX_LABEL,
  WORKSPACE_COMMAND_EVENT,
  type WorkspaceCommand,
} from "./workspace-commands";
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

/**
 * Produce a human-readable label for the number of open panes.
 *
 * @param count - The total number of open panes
 * @returns `"1 pane open"` if `count` is 1, otherwise `"<count> panes open"`
 */
function getPaneCountLabel(count: number): string {
  return count === 1 ? "1 pane open" : `${count} panes open`;
}

const TMUX_SPLIT_SIDE_BY_SIDE_SEQUENCE = ["Control+B", "%"] as unknown as HotkeySequence;
const TMUX_SPLIT_STACKED_SEQUENCE = ["Control+B", '"'] as unknown as HotkeySequence;
const TMUX_CLOSE_SEQUENCE = ["Control+B", "X"] as HotkeySequence;
const TMUX_NEXT_PANE_SEQUENCE = ["Control+B", "O"] as HotkeySequence;
const TMUX_MOVE_LEFT_SEQUENCE = ["Control+B", "ArrowLeft"] as HotkeySequence;
const TMUX_MOVE_RIGHT_SEQUENCE = ["Control+B", "ArrowRight"] as HotkeySequence;
const TMUX_MOVE_UP_SEQUENCE = ["Control+B", "ArrowUp"] as HotkeySequence;
const TMUX_MOVE_DOWN_SEQUENCE = ["Control+B", "ArrowDown"] as HotkeySequence;

/**
 * Renders a centered placeholder UI for an empty workspace pane.
 *
 * Displays an "Empty pane" message with a contextual hint: if any projects exist, prompts the user to pick one from the sidebar; otherwise prompts to add a project first.
 *
 * @returns The JSX element for the empty-pane placeholder view
 */
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

/**
 * Render a workspace node as either a resizable split group or a leaf pane with project content.
 *
 * Renders a recursive resizable split when `node.kind === "split"`, otherwise renders a leaf pane
 * header (project name, pane index and controls) and either the assigned project's board or a placeholder.
 *
 * @param node - The workspace node to render; may be a split node with two children or a leaf pane with an optional `projectId`.
 * @param paneCount - Total number of open panes in the workspace; used for display and to disable the close action when `paneCount` is 1.
 * @returns The React element representing the given workspace node.
 */
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
            title={`Split vertically (${SPLIT_SIDE_BY_SIDE_LABEL})`}
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
            title={`Split horizontally (${SPLIT_STACKED_LABEL})`}
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
            title={`Close pane (${CLOSE_PANE_LABEL})`}
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

/**
 * Render the projects workspace shell, including the project sidebar, workspace header, resizable pane layout, and bindings for workspace commands and tmux-like hotkeys.
 *
 * The component also selects the focused project when focus changes and exposes controls for splitting, closing, and moving focus between panes.
 *
 * @returns The workspace UI element (project sidebar, header, and resizable workspace). If the workspace is not ready, returns a ProjectBoardPlaceholder.
 */
function ProjectsWorkspaceShell() {
  const { projects, selectProject } = useProjects();
  const {
    assignProjectToFocusedPane,
    focusedProjectId,
    isWorkspaceReady,
    focusNextPane,
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

  useEffect(() => {
    const handleWorkspaceCommand = (event: Event) => {
      const command = (event as CustomEvent<WorkspaceCommand>).detail;

      if (command === "split-horizontal") {
        splitFocusedPane("horizontal");
        return;
      }

      if (command === "split-vertical") {
        splitFocusedPane("vertical");
        return;
      }

      if (command === "close-pane") {
        closeFocusedPane();
        return;
      }

      if (command === "next-pane") {
        focusNextPane();
        return;
      }

      if (command === "focus-left") {
        moveFocus("left");
        return;
      }

      if (command === "focus-right") {
        moveFocus("right");
        return;
      }

      if (command === "focus-up") {
        moveFocus("up");
        return;
      }

      if (command === "focus-down") {
        moveFocus("down");
      }
    };

    window.addEventListener(WORKSPACE_COMMAND_EVENT, handleWorkspaceCommand);
    return () => {
      window.removeEventListener(WORKSPACE_COMMAND_EVENT, handleWorkspaceCommand);
    };
  }, [closeFocusedPane, focusNextPane, moveFocus, splitFocusedPane]);

  useHotkeySequence(
    TMUX_SPLIT_SIDE_BY_SIDE_SEQUENCE,
    () => {
      splitFocusedPane("horizontal");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_SPLIT_STACKED_SEQUENCE,
    () => {
      splitFocusedPane("vertical");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_CLOSE_SEQUENCE,
    () => {
      closeFocusedPane();
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_NEXT_PANE_SEQUENCE,
    () => {
      focusNextPane();
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_MOVE_LEFT_SEQUENCE,
    () => {
      moveFocus("left");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_MOVE_RIGHT_SEQUENCE,
    () => {
      moveFocus("right");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_MOVE_UP_SEQUENCE,
    () => {
      moveFocus("up");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
    },
  );

  useHotkeySequence(
    TMUX_MOVE_DOWN_SEQUENCE,
    () => {
      moveFocus("down");
    },
    {
      enabled: isWorkspaceReady,
      ignoreInputs: true,
      preventDefault: true,
      timeout: 1200,
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
              {TMUX_PREFIX_LABEL} then % / " / x / o / arrows
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

/**
 * Render the projects workspace, gating rendering on project initialization and providing workspace context.
 *
 * @param initialProjectId - Optional project id to focus when the workspace initializes
 * @param routeWorkspaceState - Optional serialized workspace state from the route to restore layout/selection
 * @param onWorkspaceStateChange - Callback invoked when the workspace state changes
 * @returns The workspace UI element when projects are initialized; otherwise a placeholder indicating projects are not ready
 */
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
