import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const TASKS_UPDATED_EVENT = "tasks:updated";

export type DexTask = {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  priority: number | null;
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  blockedBy: string[];
  blocks: string[];
};

type TasksUpdatedEventPayload = {
  projectPath: string;
  tasks: DexTask[];
};

export async function watchProjectTasks(projectPath: string): Promise<DexTask[]> {
  return invoke<DexTask[]>("watch_project_tasks", { projectPath });
}

export async function unwatchProjectTasks(projectPath: string): Promise<void> {
  await invoke("unwatch_project_tasks", { projectPath });
}

export async function clearProjectTasksWatch(): Promise<void> {
  await invoke("clear_project_tasks_watch");
}

export async function listenToTaskUpdates(
  onTasksUpdated: (payload: TasksUpdatedEventPayload) => void,
): Promise<() => void> {
  const unlisten = await listen<TasksUpdatedEventPayload>(TASKS_UPDATED_EVENT, (event) => {
    const payload = event.payload;
    if (!payload?.projectPath || !Array.isArray(payload.tasks)) {
      return;
    }

    onTasksUpdated(payload);
  });

  return () => {
    unlisten();
  };
}
