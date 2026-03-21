import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  assignProjectToPane,
  closeWorkspacePane,
  createWorkspaceState,
  focusNextWorkspacePane,
  focusWorkspacePane,
  getWorkspacePaneById,
  listWorkspacePanes,
  moveWorkspaceFocus,
  normalizeWorkspaceState,
  serializeWorkspaceState,
  splitWorkspacePane,
  updateSplitSizes,
  type WorkspaceMoveDirection,
  type WorkspacePaneNode,
  type WorkspaceSplitAxis,
  type WorkspaceState,
} from "./workspace-state";

const WORKSPACE_STORAGE_KEY = "dextop-project-workspace";

type WorkspaceContextValue = {
  workspaceState: WorkspaceState;
  panes: WorkspacePaneNode[];
  focusedPaneId: string;
  focusedProjectId: string | null;
  isWorkspaceReady: boolean;
  splitPane: (paneId: string, axis: WorkspaceSplitAxis) => void;
  splitFocusedPane: (axis: WorkspaceSplitAxis) => void;
  closePane: (paneId: string) => void;
  closeFocusedPane: () => void;
  focusPane: (paneId: string) => void;
  focusNextPane: () => void;
  moveFocus: (direction: WorkspaceMoveDirection) => void;
  assignProjectToPane: (paneId: string, projectId: string | null) => void;
  assignProjectToFocusedPane: (projectId: string | null) => void;
  updateSplitLayout: (splitId: string, sizes: [number, number] | number[]) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

/**
 * Compute a storage scope identifier used to namespace persisted workspace state.
 *
 * If a Tauri window label is available and non-empty, that label is returned.
 * Otherwise the current `window.location.pathname` is returned with non-alphanumeric
 * characters replaced by `-`. If `window` is unavailable or the resulting scope
 * is empty, `"main"` is returned.
 *
 * @returns A storage scope string: the Tauri window label when present, otherwise
 * the sanitized pathname, or `"main"` as a fallback.
 */
function getWorkspaceStorageScope(): string {
  if (typeof window === "undefined") {
    return "main";
  }

  try {
    const currentWindow = getCurrentWindow();
    if (typeof currentWindow.label === "string" && currentWindow.label.trim()) {
      return currentWindow.label;
    }
  } catch {
    // Ignore non-tauri environments such as tests.
  }

  return window.location.pathname.replace(/[^a-z0-9]+/gi, "-") || "main";
}

type WorkspaceProviderProps = {
  children: ReactNode;
  initialProjectId: string | null;
  projectIds: string[];
  routeWorkspaceState: string | null;
  onWorkspaceStateChange: (serializedState: string) => void;
};

/**
 * Provides workspace state, derived pane/project focus data, and actions to manipulate the workspace to any descendant components via WorkspaceContext.
 *
 * @param children - React children to render inside the provider
 * @param initialProjectId - Optional project ID used when creating an initial workspace state (ignored if not in the provided projectIds)
 * @param projectIds - List of valid project IDs used to normalize persisted or incoming workspace state
 * @param routeWorkspaceState - Optional serialized workspace state (e.g., from a route) that takes precedence during initial hydration
 * @param onWorkspaceStateChange - Callback invoked with the serialized workspace state when it changes (only after initial hydration)
 * @returns The WorkspaceContext provider element that renders `children`
 */
export function WorkspaceProvider({
  children,
  initialProjectId,
  projectIds,
  routeWorkspaceState,
  onWorkspaceStateChange,
}: WorkspaceProviderProps) {
  const hasHydratedRef = useRef(false);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() =>
    createWorkspaceState(initialProjectId),
  );

  const validProjectIds = useMemo(() => new Set(projectIds), [projectIds]);

  useEffect(() => {
    if (hasHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const key = `${WORKSPACE_STORAGE_KEY}:${getWorkspaceStorageScope()}`;
    setStorageKey(key);

    const storedValue = routeWorkspaceState ?? window.localStorage.getItem(key);
    let parsedValue: unknown = null;

    if (storedValue) {
      try {
        parsedValue = JSON.parse(storedValue);
      } catch {
        parsedValue = null;
      }
    }

    setWorkspaceState(
      normalizeWorkspaceState(
        parsedValue,
        validProjectIds,
        initialProjectId && validProjectIds.has(initialProjectId) ? initialProjectId : null,
      ),
    );
    setIsWorkspaceReady(true);
    hasHydratedRef.current = true;
  }, [initialProjectId, routeWorkspaceState, validProjectIds]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    setWorkspaceState((currentState) =>
      normalizeWorkspaceState(
        currentState,
        validProjectIds,
        initialProjectId && validProjectIds.has(initialProjectId) ? initialProjectId : null,
      ),
    );
  }, [initialProjectId, validProjectIds]);

  useEffect(() => {
    if (!storageKey || !isWorkspaceReady || typeof window === "undefined") {
      return;
    }

    const serializedState = serializeWorkspaceState(workspaceState);
    window.localStorage.setItem(storageKey, serializedState);

    if (serializedState !== routeWorkspaceState) {
      onWorkspaceStateChange(serializedState);
    }
  }, [
    isWorkspaceReady,
    onWorkspaceStateChange,
    routeWorkspaceState,
    storageKey,
    workspaceState,
  ]);

  const panes = useMemo(() => listWorkspacePanes(workspaceState.root), [workspaceState.root]);

  const splitPane = useCallback((paneId: string, axis: WorkspaceSplitAxis) => {
    setWorkspaceState((currentState) => splitWorkspacePane(currentState, paneId, axis));
  }, []);

  const splitFocusedPane = useCallback((axis: WorkspaceSplitAxis) => {
    setWorkspaceState((currentState) =>
      splitWorkspacePane(currentState, currentState.focusedPaneId, axis),
    );
  }, []);

  const closePane = useCallback((paneId: string) => {
    setWorkspaceState((currentState) => closeWorkspacePane(currentState, paneId));
  }, []);

  const closeFocusedPane = useCallback(() => {
    setWorkspaceState((currentState) =>
      closeWorkspacePane(currentState, currentState.focusedPaneId),
    );
  }, []);

  const focusPane = useCallback((paneId: string) => {
    setWorkspaceState((currentState) => focusWorkspacePane(currentState, paneId));
  }, []);

  const focusNextPane = useCallback(() => {
    setWorkspaceState((currentState) => focusNextWorkspacePane(currentState));
  }, []);

  const moveFocus = useCallback((direction: WorkspaceMoveDirection) => {
    setWorkspaceState((currentState) => moveWorkspaceFocus(currentState, direction));
  }, []);

  const assignProject = useCallback((paneId: string, projectId: string | null) => {
    setWorkspaceState((currentState) => assignProjectToPane(currentState, paneId, projectId));
  }, []);

  const assignProjectToFocusedPane = useCallback((projectId: string | null) => {
    setWorkspaceState((currentState) =>
      assignProjectToPane(currentState, currentState.focusedPaneId, projectId),
    );
  }, []);

  const updateSplitLayout = useCallback(
    (splitId: string, sizes: [number, number] | number[]) => {
      setWorkspaceState((currentState) => updateSplitSizes(currentState, splitId, sizes));
    },
    [],
  );

  const focusedProjectId = useMemo(
    () => getWorkspacePaneById(workspaceState.root, workspaceState.focusedPaneId)?.projectId ?? null,
    [workspaceState.focusedPaneId, workspaceState.root],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaceState,
      panes,
      focusedPaneId: workspaceState.focusedPaneId,
      focusedProjectId,
      isWorkspaceReady,
      splitPane,
      splitFocusedPane,
      closePane,
      closeFocusedPane,
      focusPane,
      focusNextPane,
      moveFocus,
      assignProjectToPane: assignProject,
      assignProjectToFocusedPane,
      updateSplitLayout,
    }),
    [
      assignProject,
      assignProjectToFocusedPane,
      closePane,
      closeFocusedPane,
      focusPane,
      focusNextPane,
      focusedProjectId,
      isWorkspaceReady,
      moveFocus,
      panes,
      splitPane,
      splitFocusedPane,
      updateSplitLayout,
      workspaceState,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/**
 * Access the workspace context for the current React tree.
 *
 * @returns The current WorkspaceContextValue containing the workspace state, derived pane/project metadata, readiness flag, and action handlers.
 * @throws {Error} If called outside of a WorkspaceProvider.
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
