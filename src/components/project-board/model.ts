import { ListTodo, LoaderCircle, OctagonAlert, PartyPopper, type LucideIcon } from "lucide-react";
import type { DexTask } from "@/lib/tasks-service";

export type KanbanColumnKey = "todo" | "inProgress" | "blocked" | "done";
export type TaskFilterKey = "all" | "blocked" | "inProgress" | "highPriority";
export type StatusTone = "neutral" | "active" | "warning" | "success";
export type SubtaskProgress = { completed: number; total: number };
export type GroupedTasks = Record<KanbanColumnKey, DexTask[]>;

export type CreateTaskFormState = {
  name: string;
  description: string;
  priority: string;
  parentId: string;
  blockedBy: string[];
};

export const INITIAL_CREATE_TASK_FORM: CreateTaskFormState = {
  name: "",
  description: "",
  priority: "1",
  parentId: "",
  blockedBy: [],
};

export const KANBAN_COLUMNS: Array<{
  key: KanbanColumnKey;
  label: string;
  compactLabel: string;
  icon: LucideIcon;
}> = [
  { key: "todo", label: "Todo", compactLabel: "Todo", icon: ListTodo },
  { key: "inProgress", label: "In Progress", compactLabel: "Doing", icon: LoaderCircle },
  { key: "blocked", label: "Blocked", compactLabel: "Blocked", icon: OctagonAlert },
  { key: "done", label: "Done", compactLabel: "Done", icon: PartyPopper },
];

export function formatShortPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 3) {
    return path;
  }

  return `.../${segments.slice(-3).join("/")}`;
}

export function getTaskColumnKey(
  task: Pick<DexTask, "completed" | "startedAt" | "blockedBy">,
): KanbanColumnKey {
  if (task.completed) {
    return "done";
  }

  if (task.blockedBy.length > 0) {
    return "blocked";
  }

  if (task.startedAt) {
    return "inProgress";
  }

  return "todo";
}

export function getTaskStatusLabel(
  task: Pick<DexTask, "completed" | "startedAt" | "blockedBy">,
): string {
  const status = getTaskColumnKey(task);
  if (status === "todo") {
    return "Todo";
  }
  if (status === "inProgress") {
    return "In Progress";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  return "Done";
}

export function getTaskStatusTone(
  task: Pick<DexTask, "completed" | "startedAt" | "blockedBy">,
): StatusTone {
  const status = getTaskColumnKey(task);
  if (status === "inProgress") {
    return "active";
  }
  if (status === "blocked") {
    return "warning";
  }
  if (status === "done") {
    return "success";
  }
  return "neutral";
}

export function formatTaskDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

function toTimestamp(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function compareTasksByRecentActivity(left: DexTask, right: DexTask): number {
  const updatedAtDiff = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  const createdAtDiff = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return left.id.localeCompare(right.id);
}

export function groupTasksByColumn(tasks: DexTask[]): GroupedTasks {
  const columns: GroupedTasks = {
    todo: [],
    inProgress: [],
    blocked: [],
    done: [],
  };

  for (const task of tasks) {
    columns[getTaskColumnKey(task)].push(task);
  }

  return columns;
}

export function summarizeBoardTasks(tasks: DexTask[], groupedTasks: GroupedTasks) {
  return {
    total: tasks.length,
    open: tasks.filter((task) => !task.completed).length,
    blocked: groupedTasks.blocked.length,
    done: groupedTasks.done.length,
  };
}

export function filterBoardTasks(
  groupedTasks: GroupedTasks,
  taskFilter: TaskFilterKey,
): GroupedTasks {
  const matchesFilter = (task: DexTask) => {
    if (taskFilter === "blocked") {
      return task.blockedBy.length > 0;
    }

    if (taskFilter === "inProgress") {
      return !task.completed && Boolean(task.startedAt) && task.blockedBy.length === 0;
    }

    if (taskFilter === "highPriority") {
      return task.priority !== null && task.priority <= 2;
    }

    return true;
  };

  return {
    todo: groupedTasks.todo.filter(matchesFilter),
    inProgress: groupedTasks.inProgress.filter(matchesFilter),
    blocked: groupedTasks.blocked.filter(matchesFilter),
    done: groupedTasks.done.filter(matchesFilter),
  };
}

export function indexTasksById(tasks: DexTask[]): Map<string, DexTask> {
  const byId = new Map<string, DexTask>();
  for (const task of tasks) {
    byId.set(task.id, task);
  }
  return byId;
}

export function groupSubtasksByParentId(tasks: DexTask[]): Map<string, DexTask[]> {
  const byParentId = new Map<string, DexTask[]>();
  for (const task of tasks) {
    if (!task.parentId) {
      continue;
    }

    const existing = byParentId.get(task.parentId);
    if (existing) {
      existing.push(task);
    } else {
      byParentId.set(task.parentId, [task]);
    }
  }

  return byParentId;
}

export function summarizeSubtaskProgress(
  subtasksByParentId: Map<string, DexTask[]>,
): Map<string, SubtaskProgress> {
  const progressByTaskId = new Map<string, SubtaskProgress>();
  for (const [parentId, subtasks] of subtasksByParentId) {
    const completed = subtasks.filter((task) => task.completed).length;
    progressByTaskId.set(parentId, { completed, total: subtasks.length });
  }

  return progressByTaskId;
}

export function getTaskMutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "We couldn't add the task. Try again.";
}
