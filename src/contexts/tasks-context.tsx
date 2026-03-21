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
  projectTasksByPath: Record<string, DexTask[]>;
  getProjectTasks: (projectPath: string | null) => DexTask[];
  initializeTasksStore: () => Promise<void>;
  disposeTasksStore: () => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function countOpenTasks(tasks: DexTask[]): number {
  return tasks.filter((task) => !task.completed).length;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { projects, setProjectTaskCount } = useProjects();
  const [projectTasksByPath, setProjectTasksByPath] = useState<Record<string, DexTask[]>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const unlistenTaskUpdatesRef = useRef<(() => void) | undefined>(undefined);
  const initializationPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const watchedProjectPathsRef = useRef<Set<string>>(new Set<string>());
  const projectTasksByPathRef = useRef<Record<string, DexTask[]>>({});
  projectTasksByPathRef.current = projectTasksByPath;

  const applyTasks = useCallback(
    (projectPath: string, tasks: DexTask[]) => {
      setProjectTasksByPath((currentTasks) => ({
        ...currentTasks,
        [projectPath]: tasks,
      }));
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

  useEffect(() => {
    const projectPaths = new Set(projects.map((project) => project.path));
    setProjectTasksByPath((currentTasks) =>
      Object.fromEntries(
        Object.entries(currentTasks).filter(([projectPath]) => projectPaths.has(projectPath)),
      ),
    );
  }, [projects]);

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

  const disposeTasksStore = useCallback(() => {
    unlistenTaskUpdatesRef.current?.();
    unlistenTaskUpdatesRef.current = undefined;
    initializationPromiseRef.current = undefined;
    isInitializedRef.current = false;
    watchedProjectPathsRef.current = new Set<string>();
    setIsInitialized(false);
    void clearProjectTasksWatch().catch((error) => {
      console.error("Failed to clear project task watcher", error);
    });
    setProjectTasksByPath({});
  }, []);

  const getProjectTasks = useCallback(
    (projectPath: string | null) => {
      if (!projectPath) {
        return [];
      }

      return projectTasksByPathRef.current[projectPath] ?? [];
    },
    [],
  );

  const value = useMemo<TasksContextValue>(
    () => ({
      projectTasksByPath,
      getProjectTasks,
      initializeTasksStore,
      disposeTasksStore,
    }),
    [disposeTasksStore, getProjectTasks, initializeTasksStore, projectTasksByPath],
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
