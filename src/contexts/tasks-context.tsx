import type { Accessor, JSX } from "solid-js";
import { createContext, createSignal, useContext } from "solid-js";
import { useProjects } from "@/contexts/projects-context";
import {
  clearProjectTasksWatch,
  listenToTaskUpdates,
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
  const { setProjectTaskCount } = useProjects();
  const [projectTasksState, setProjectTasksState] = createSignal<DexTask[]>([]);
  const [activeProjectPathState, setActiveProjectPathState] = createSignal<string | null>(null);

  let unlistenTaskUpdates: (() => void) | undefined;
  let initializationPromise: Promise<void> | undefined;
  let isInitialized = false;

  const applyTasks = (projectPath: string, tasks: DexTask[]) => {
    setProjectTasksState(tasks);
    setProjectTaskCount(projectPath, countOpenTasks(tasks));
  };

  const initializeTasksStore = async () => {
    if (isInitialized) {
      return;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      unlistenTaskUpdates = await listenToTaskUpdates(({ projectPath, tasks }) => {
        if (projectPath !== activeProjectPathState()) {
          return;
        }

        applyTasks(projectPath, tasks);
      });
      isInitialized = true;
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
      await clearProjectTasksWatch();
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
