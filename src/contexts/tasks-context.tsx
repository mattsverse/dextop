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
import { useProjects } from "@/contexts/projects-context";
import {
  clearProjectTasksWatch,
  listenToTaskUpdates,
  unwatchProjectTasks,
  watchProjectTasks,
  type DexTask,
} from "@/lib/tasks-service";

type TasksContextValue = {
  projectTasks: DexTask[];
  initializeTasksStore: () => Promise<void>;
  setActiveProjectPath: (projectPath: string | null) => Promise<void>;
  disposeTasksStore: () => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function countOpenTasks(tasks: DexTask[]): number {
  return tasks.filter((task) => !task.completed).length;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { projects, setProjectTaskCount } = useProjects();
  const [projectTasks, setProjectTasks] = useState<DexTask[]>([]);
  const [activeProjectPath, setActiveProjectPathState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const unlistenTaskUpdatesRef = useRef<(() => void) | undefined>(undefined);
  const initializationPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const watchedProjectPathsRef = useRef<Set<string>>(new Set<string>());
  const activeProjectPathRef = useRef<string | null>(null);

  useEffect(() => {
    activeProjectPathRef.current = activeProjectPath;
  }, [activeProjectPath]);

  const applyTasks = useCallback(
    (projectPath: string, tasks: DexTask[]) => {
      if (activeProjectPathRef.current === projectPath) {
        setProjectTasks(tasks);
      }

      setProjectTaskCount(projectPath, countOpenTasks(tasks));
    },
    [setProjectTaskCount],
  );

  const syncProjectWatches = useCallback(
    async (projectPaths: string[]) => {
      const normalizedProjectPaths = [...new Set(projectPaths.filter(Boolean))];
      const nextWatchedProjectPaths = new Set(normalizedProjectPaths);

      const projectPathsToRemove = [...watchedProjectPathsRef.current].filter(
        (projectPath) => !nextWatchedProjectPaths.has(projectPath),
      );
      const projectPathsToAdd = normalizedProjectPaths.filter(
        (projectPath) => !watchedProjectPathsRef.current.has(projectPath),
      );

      watchedProjectPathsRef.current = nextWatchedProjectPaths;

      await Promise.all(
        projectPathsToRemove.map(async (projectPath) => {
          await unwatchProjectTasks(projectPath);
        }),
      );

      const taskSnapshots = await Promise.all(
        projectPathsToAdd.map(async (projectPath) => ({
          projectPath,
          tasks: await watchProjectTasks(projectPath),
        })),
      );

      for (const { projectPath, tasks } of taskSnapshots) {
        applyTasks(projectPath, tasks);
      }
    },
    [applyTasks],
  );

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    void syncProjectWatches(projects.map((project) => project.path)).catch((error) => {
      console.error("Failed to synchronize project task watchers", error);
    });
  }, [isInitialized, projects, syncProjectWatches]);

  const initializeTasksStore = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = (async () => {
      unlistenTaskUpdatesRef.current = await listenToTaskUpdates(({ projectPath, tasks }) => {
        applyTasks(projectPath, tasks);
      });
      isInitializedRef.current = true;
      setIsInitialized(true);
    })();

    try {
      await initializationPromiseRef.current;
    } finally {
      initializationPromiseRef.current = undefined;
    }
  }, [applyTasks]);

  const setActiveProjectPath = useCallback(
    async (projectPath: string | null) => {
      if (projectPath === activeProjectPathRef.current) {
        return;
      }

      activeProjectPathRef.current = projectPath;
      setActiveProjectPathState(projectPath);

      if (!projectPath) {
        setProjectTasks([]);
        return;
      }

      const tasks = await watchProjectTasks(projectPath);
      if (activeProjectPathRef.current !== projectPath) {
        return;
      }

      applyTasks(projectPath, tasks);
    },
    [applyTasks],
  );

  const disposeTasksStore = useCallback(() => {
    unlistenTaskUpdatesRef.current?.();
    unlistenTaskUpdatesRef.current = undefined;
    initializationPromiseRef.current = undefined;
    isInitializedRef.current = false;
    watchedProjectPathsRef.current = new Set<string>();
    activeProjectPathRef.current = null;
    setIsInitialized(false);
    void clearProjectTasksWatch().catch((error) => {
      console.error("Failed to clear project task watcher", error);
    });
    setProjectTasks([]);
    setActiveProjectPathState(null);
  }, []);

  const value = useMemo<TasksContextValue>(
    () => ({
      projectTasks,
      initializeTasksStore,
      setActiveProjectPath,
      disposeTasksStore,
    }),
    [disposeTasksStore, initializeTasksStore, projectTasks, setActiveProjectPath],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }

  return context;
}
