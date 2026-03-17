import type { Accessor, JSX } from "solid-js";
import { createContext, createEffect, createSignal, useContext } from "solid-js";
import { useProjects } from "@/contexts/projects-context";
import {
  clearProjectTasksWatch,
  listenToTaskUpdates,
  unwatchProjectTasks,
  watchProjectTasks,
  type DexTask,
} from "@/lib/tasks-service";

type TasksContextValue = {
  projectTasks: Accessor<DexTask[]>;
  initializeTasksStore: () => Promise<void>;
  setActiveProjectPath: (projectPath: string | null) => Promise<void>;
  disposeTasksStore: () => void;
};

const TasksContext = createContext<TasksContextValue>();

function countOpenTasks(tasks: DexTask[]): number {
  return tasks.filter((task) => !task.completed).length;
}

export function TasksProvider(props: { children: JSX.Element }) {
  const { projects, setProjectTaskCount } = useProjects();
  const [projectTasksState, setProjectTasksState] = createSignal<DexTask[]>([]);
  const [activeProjectPathState, setActiveProjectPathState] = createSignal<string | null>(null);
  const [isInitializedState, setIsInitializedState] = createSignal(false);

  let unlistenTaskUpdates: (() => void) | undefined;
  let initializationPromise: Promise<void> | undefined;
  let isInitialized = false;
  let watchedProjectPaths = new Set<string>();

  const applyTasks = (projectPath: string, tasks: DexTask[]) => {
    if (activeProjectPathState() === projectPath) {
      setProjectTasksState(tasks);
    }
    setProjectTaskCount(projectPath, countOpenTasks(tasks));
  };

  const syncProjectWatches = async (projectPaths: string[]) => {
    const normalizedProjectPaths = [...new Set(projectPaths.filter(Boolean))];
    const nextWatchedProjectPaths = new Set(normalizedProjectPaths);

    const projectPathsToRemove = [...watchedProjectPaths].filter(
      (projectPath) => !nextWatchedProjectPaths.has(projectPath),
    );
    const projectPathsToAdd = normalizedProjectPaths.filter(
      (projectPath) => !watchedProjectPaths.has(projectPath),
    );

    watchedProjectPaths = nextWatchedProjectPaths;

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
  };

  createEffect(() => {
    if (!isInitializedState()) {
      return;
    }

    const projectPaths = projects().map((project) => project.path);
    void syncProjectWatches(projectPaths).catch((error) => {
      console.error("Failed to synchronize project task watchers", error);
    });
  });

  const initializeTasksStore = async () => {
    if (isInitialized) {
      return;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      unlistenTaskUpdates = await listenToTaskUpdates(({ projectPath, tasks }) => {
        applyTasks(projectPath, tasks);
      });
      isInitialized = true;
      setIsInitializedState(true);
    })();

    try {
      await initializationPromise;
    } finally {
      initializationPromise = undefined;
    }
  };

  const setActiveProjectPath = async (projectPath: string | null) => {
    if (projectPath === activeProjectPathState()) {
      return;
    }

    setActiveProjectPathState(projectPath);

    if (!projectPath) {
      setProjectTasksState([]);
      return;
    }

    const tasks = await watchProjectTasks(projectPath);
    if (activeProjectPathState() !== projectPath) {
      return;
    }

    applyTasks(projectPath, tasks);
  };

  const disposeTasksStore = () => {
    unlistenTaskUpdates?.();
    unlistenTaskUpdates = undefined;
    initializationPromise = undefined;
    isInitialized = false;
    watchedProjectPaths = new Set<string>();
    setIsInitializedState(false);
    void clearProjectTasksWatch().catch((error) => {
      console.error("Failed to clear project task watcher", error);
    });
    setProjectTasksState([]);
    setActiveProjectPathState(null);
  };

  return (
    <TasksContext.Provider
      value={{
        projectTasks: projectTasksState,
        initializeTasksStore,
        setActiveProjectPath,
        disposeTasksStore,
      }}
    >
      {props.children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }

  return context;
}
