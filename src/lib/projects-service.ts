import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const PROJECT_ADDED_EVENT = "projects:added";
export const PROJECT_DELETED_EVENT = "projects:deleted";

export type ProjectItem = {
  id: string;
  name: string;
  path: string;
  tasks: number;
};

type ProjectRecord = {
  id: number;
  folderName: string;
  folderPath: string;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectAddedEventPayload = {
  project: ProjectRecord;
};

type ProjectDeletedEventPayload = {
  projectId: number;
};

export type ProjectMutationHandlers = {
  onProjectAdded?: (project: ProjectItem) => void;
  onProjectDeleted?: (projectId: string) => void;
};

function toProjectItem(record: ProjectRecord): ProjectItem {
  return {
    id: String(record.id),
    name: record.folderName,
    path: record.folderPath,
    tasks: 0,
  };
}

export async function listProjects(): Promise<ProjectItem[]> {
  const records = await invoke<ProjectRecord[]>("list_projects");
  return records.map(toProjectItem);
}

export async function openProject(): Promise<ProjectItem | null> {
  const record = await invoke<ProjectRecord | null>("pick_and_add_project");
  return record ? toProjectItem(record) : null;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId)) {
    return false;
  }

  return invoke<boolean>("delete_project", { projectId: numericProjectId });
}

export async function openProjectWindow(projectId: string): Promise<void> {
  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId)) {
    return;
  }

  await invoke("open_project_window", { projectId: numericProjectId });
}

export async function clearProjects(): Promise<number> {
  return invoke<number>("clear_projects");
}

export async function listenToProjectMutations(
  handlers: ProjectMutationHandlers,
): Promise<() => void> {
  const unlistenProjectAdded = await listen<ProjectAddedEventPayload>(
    PROJECT_ADDED_EVENT,
    (event) => {
      const projectRecord = event.payload?.project;
      if (!projectRecord) {
        return;
      }

      handlers.onProjectAdded?.(toProjectItem(projectRecord));
    },
  );

  const unlistenProjectDeleted = await listen<ProjectDeletedEventPayload>(
    PROJECT_DELETED_EVENT,
    (event) => {
      const deletedProjectId = event.payload?.projectId;
      if (typeof deletedProjectId !== "number") {
        return;
      }

      handlers.onProjectDeleted?.(String(deletedProjectId));
    },
  );

  return () => {
    unlistenProjectAdded();
    unlistenProjectDeleted();
  };
}
